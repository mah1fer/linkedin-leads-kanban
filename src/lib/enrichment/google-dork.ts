export interface GoogleDorkResult {
  emails: Array<{ value: string; source_url: string; confidence: number }>
  phones: Array<{ value: string; source_url: string; type: 'mobile' | 'landline' }>
  social_profiles: Array<{ platform: string; url: string }>
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
const PHONE_BR_REGEX = /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})[\s\-]?\d{4}/g

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

function parseEmailsFromText(text: string, sourceUrl: string): GoogleDorkResult['emails'] {
  const raw = text.match(EMAIL_REGEX) || []
  return raw
    .filter((e) => !e.endsWith('.png') && !e.endsWith('.jpg'))
    .map((value) => ({ value: value.toLowerCase(), source_url: sourceUrl, confidence: 55 }))
}

function parsePhonesFromText(text: string, sourceUrl: string): GoogleDorkResult['phones'] {
  const raw = text.match(PHONE_BR_REGEX) || []
  return raw.map((value) => ({
    value,
    source_url: sourceUrl,
    type: value.replace(/\D/g, '').slice(-9).startsWith('9') ? 'mobile' : 'landline',
  }))
}

function parseSocialProfilesFromText(text: string): GoogleDorkResult['social_profiles'] {
  const profiles: GoogleDorkResult['social_profiles'] = []
  const igMatch = text.match(/instagram\.com\/([A-Za-z0-9._]+)/g)
  const twMatch = text.match(/(?:twitter|x)\.com\/([A-Za-z0-9._]+)/g)
  if (igMatch) igMatch.forEach((url) => profiles.push({ platform: 'instagram', url: `https://${url}` }))
  if (twMatch) twMatch.forEach((url) => profiles.push({ platform: 'twitter', url: `https://${url}` }))
  return profiles
}

async function fetchGoogleSearchResults(query: string): Promise<string> {
  try {
    const encodedQuery = encodeURIComponent(query)
    const res = await fetch(`https://www.google.com/search?q=${encodedQuery}&num=10&hl=pt-BR`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
    })
    if (!res.ok) return ''
    return await res.text()
  } catch {
    return ''
  }
}

export async function googleDorkSearch(
  name: string,
  company: string,
  options: { forEmail?: boolean; forWhatsApp?: boolean; forSocial?: boolean } = { forEmail: true }
): Promise<GoogleDorkResult> {
  const result: GoogleDorkResult = { emails: [], phones: [], social_profiles: [] }

  const queries: string[] = []

  if (options.forEmail) {
    queries.push(`"${name}" "${company}" email OR @ OR contact`)
    queries.push(`"${name}" "${company}" site:linkedin.com`)
  }
  if (options.forWhatsApp) {
    queries.push(`"${name}" "${company}" whatsapp OR celular OR +55`)
    queries.push(`"${name}" "${company}" site:instagram.com OR site:twitter.com`)
  }
  if (options.forSocial) {
    queries.push(`"${name}" "${company}" site:instagram.com OR site:twitter.com`)
  }

  // Max 5 queries with delays to avoid rate limiting
  const maxQueries = queries.slice(0, 5)

  for (let i = 0; i < maxQueries.length; i++) {
    if (i > 0) await sleep(2000 + Math.random() * 3000)

    const html = await fetchGoogleSearchResults(maxQueries[i])
    if (!html) continue

    // Extract href links from Google results (plain text parsing)
    const linkMatches = html.match(/href="(https?:\/\/[^"]+)"/g) || []
    const urls = linkMatches
      .map((m) => m.replace(/href="/, '').replace(/"$/, ''))
      .filter((u) => !u.includes('google.com'))
      .slice(0, 8)

    for (const url of urls) {
      result.emails.push(...parseEmailsFromText(html, url))
      result.phones.push(...parsePhonesFromText(html, url))
      result.social_profiles.push(...parseSocialProfilesFromText(html))
    }

    // Also parse the HTML body for inline data
    result.emails.push(...parseEmailsFromText(html, `google-search:${maxQueries[i]}`))
    result.phones.push(...parsePhonesFromText(html, `google-search:${maxQueries[i]}`))
  }

  // Deduplicate
  result.emails = [...new Map(result.emails.map((e) => [e.value, e])).values()]
  result.phones = [...new Map(result.phones.map((p) => [p.value, p])).values()]
  result.social_profiles = [
    ...new Map(result.social_profiles.map((s) => [s.url, s])).values(),
  ]

  return result
}
