import { createClient } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'
import { googleDorkSearch } from '@/lib/enrichment/plugins/google-dork'

interface FoundPerson {
  name: string
  title?: string
  linkedin_url?: string
  company_name: string
  company_url: string
}

async function searchCompanyWithGoogleDork(
  companyName: string,
  companyUrl: string,
  roleFilter: string,
  maxResults: number
): Promise<FoundPerson[]> {
  const slug = (() => {
    try { return new URL(companyUrl).pathname.split('/').filter(Boolean).pop() || companyName }
    catch { return companyName }
  })()

  const found: Map<string, FoundPerson> = new Map()

  const result = await googleDorkSearch(slug, roleFilter || 'profissional', { forSocial: true })
  for (const profile of result.social_profiles) {
    if (profile.url.includes('linkedin.com/in/') && !found.has(profile.url)) {
      const urlParts = profile.url.replace(/\/$/, '').split('/')
      const profileSlug = urlParts[urlParts.length - 1]
      const nameGuess = profileSlug.replace(/-/g, ' ').replace(/\d+/g, '').trim()
      found.set(profile.url, {
        name: nameGuess || 'Unknown',
        title: roleFilter || undefined,
        linkedin_url: profile.url,
        company_name: companyName,
        company_url: companyUrl,
      })
    }
    if (found.size >= maxResults) break
  }

  return Array.from(found.values()).slice(0, maxResults)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { company_url, company_name, role_filter, max_results = 10 } = body

  if (!company_url && !company_name) {
    return NextResponse.json({ error: 'company_url or company_name required' }, { status: 400 })
  }

  const name = company_name || company_url
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

    const people = await searchCompanyWithGoogleDork(name, company_url || name, role_filter, max_results)

    if (searchRecord) {
      await supabase
        .from('company_searches')
        .update({ results_count: people.length, status: 'done' })
        .eq('id', searchRecord.id)
    }

    return NextResponse.json({ people, search_id: searchRecord?.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
