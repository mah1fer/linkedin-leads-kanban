import { createClient } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'

interface FoundPerson {
  name: string
  title?: string
  linkedin_url?: string
  company_name: string
  company_url: string
}

const UA = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
]

const LI_RE = /https?:\/\/(?:www\.)?linkedin\.com\/in\/([\w\-%]+)\/?/g

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function nameFromSlug(slug: string): string {
  return slug
    .replace(/-\d+$/, '')          // remove sufixo numérico ex: joao-silva-123456
    .split('-')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA[Math.floor(Math.random() * UA.length)],
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

function extractLinkedInUrls(html: string): string[] {
  const urls: string[] = []
  const seen = new Set<string>()
  let m: RegExpExecArray | null
  // reset lastIndex
  LI_RE.lastIndex = 0
  while ((m = LI_RE.exec(html)) !== null) {
    const slug = m[1]
    const url = `https://www.linkedin.com/in/${slug}`
    if (!seen.has(url) && !slug.includes('overlay') && slug.length > 2) {
      seen.add(url)
      urls.push(url)
    }
  }
  return urls
}

/**
 * Busca perfis LinkedIn via DuckDuckGo HTML + Bing.
 * Não usa Google (bloqueado no servidor).
 */
async function searchLinkedInProfiles(
  companyName: string,
  companySlug: string,
  roleFilter: string,
  maxResults: number
): Promise<FoundPerson[]> {
  const found = new Map<string, FoundPerson>()

  const addUrls = (urls: string[], source: string) => {
    for (const url of urls) {
      if (found.size >= maxResults) break
      if (!found.has(url)) {
        const slug = url.split('/in/')[1] || ''
        found.set(url, {
          name: nameFromSlug(slug) || 'Unknown',
          title: roleFilter || undefined,
          linkedin_url: url,
          company_name: companyName,
          company_url: companySlug,
        })
        console.log(`[CompanySearch] ${source}: ${url}`)
      }
    }
  }

  // Múltiplas variações de query para cobrir mais perfis
  const role = roleFilter.trim()
  const company = companySlug.trim()
  const queries = role
    ? [
        `site:linkedin.com/in/ "${company}" "${role}"`,
        `site:linkedin.com/in/ "${companyName}" "${role}"`,
        `site:linkedin.com/in/ "${company}" ${role}`,
      ]
    : [
        `site:linkedin.com/in/ "${company}"`,
        `site:linkedin.com/in/ "${companyName}"`,
      ]

  for (const query of queries) {
    if (found.size >= maxResults) break

    const encoded = encodeURIComponent(query)

    // 1. DuckDuckGo HTML — mais permissivo para scraping
    try {
      const html = await fetchHtml(`https://html.duckduckgo.com/html/?q=${encoded}`)
      addUrls(extractLinkedInUrls(html), 'DDG')
    } catch (err) {
      console.warn('[CompanySearch] DDG falhou:', err)
    }

    // 2. Bing — fallback
    if (found.size < maxResults) {
      try {
        const html = await fetchHtml(
          `https://www.bing.com/search?q=${encoded}&count=20&setlang=pt-br`
        )
        addUrls(extractLinkedInUrls(html), 'Bing')
      } catch (err) {
        console.warn('[CompanySearch] Bing falhou:', err)
      }
    }

    if (found.size < maxResults) await sleep(1000)
  }

  return Array.from(found.values()).slice(0, maxResults)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { company_url, company_name, role_filter = '', max_results = 10 } = body

  if (!company_url && !company_name) {
    return NextResponse.json({ error: 'company_url or company_name required' }, { status: 400 })
  }

  // Extrai o slug da URL do LinkedIn (linkedin.com/company/empresa → "empresa")
  const slug = (() => {
    try {
      const u = new URL(company_url || '')
      return u.pathname.split('/').filter(Boolean).pop() || company_name || ''
    } catch {
      return company_name || company_url || ''
    }
  })()

  const name = company_name || slug
  const supabase = createClient()

  try {
    const { data: searchRecord } = await supabase
      .from('company_searches')
      .insert([{
        company_name: name,
        company_url: company_url,
        filters: { role_filter, max_results },
        status: 'running',
      }])
      .select()
      .single()

    const people = await searchLinkedInProfiles(name, slug, role_filter, max_results)

    if (searchRecord) {
      await supabase
        .from('company_searches')
        .update({ results_count: people.length, status: people.length > 0 ? 'done' : 'empty' })
        .eq('id', searchRecord.id)
    }

    return NextResponse.json({
      people,
      search_id: searchRecord?.id,
      debug: { slug, name, role_filter, found: people.length },
    })
  } catch (error: any) {
    console.error('[CompanySearch API]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
