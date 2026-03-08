import { googleDorkSearch } from './google-dork'

export interface WhatsAppResult {
  whatsapp: string
  source: string
  confidence: number
}

const PHONE_BR_REGEX = /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})[\s\-]?\d{4}/g

function normalizeWhatsApp(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`
  if (digits.length === 11) return `+55${digits}`
  if (digits.length === 10) return `+55${digits}`
  return `+55${digits}`
}

function isValidBrPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  const local = digits.startsWith('55') ? digits.slice(2) : digits
  return local.length === 10 || local.length === 11
}

export async function findWhatsApp(
  name: string,
  company: string,
  existingPhone?: string,
  existingData?: { social_profiles?: Array<{ platform: string; url: string }> }
): Promise<WhatsAppResult[]> {
  const results: WhatsAppResult[] = []

  // Source 1: Existing LinkedIn phone
  if (existingPhone) {
    const normalized = normalizeWhatsApp(existingPhone)
    if (isValidBrPhone(normalized)) {
      results.push({ whatsapp: normalized, source: 'linkedin', confidence: 90 })
    }
  }

  // Source 2: Google Dork for WhatsApp
  const dorkResult = await googleDorkSearch(name, company, { forWhatsApp: true })

  for (const phone of dorkResult.phones) {
    const normalized = normalizeWhatsApp(phone.value)
    if (isValidBrPhone(normalized) && !results.some((r) => r.whatsapp === normalized)) {
      results.push({
        whatsapp: normalized,
        source: `google:${phone.source_url}`,
        confidence: 60,
      })
    }
  }

  // Source 3: Extract from social profiles
  if (existingData?.social_profiles) {
    for (const profile of existingData.social_profiles) {
      try {
        const res = await fetch(profile.url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        })
        const html = await res.text()
        const phones = html.match(PHONE_BR_REGEX) || []
        for (const p of phones) {
          const normalized = normalizeWhatsApp(p)
          if (isValidBrPhone(normalized) && !results.some((r) => r.whatsapp === normalized)) {
            results.push({
              whatsapp: normalized,
              source: `${profile.platform}:${profile.url}`,
              confidence: 65,
            })
          }
        }
      } catch {
        // Ignore unreachable profiles
      }
    }
  }

  // Source 4: Try corporate website contact page
  const companyDorkResult = await googleDorkSearch(name, company, { forSocial: true })
  for (const phone of companyDorkResult.phones) {
    const normalized = normalizeWhatsApp(phone.value)
    if (isValidBrPhone(normalized) && !results.some((r) => r.whatsapp === normalized)) {
      results.push({ whatsapp: normalized, source: `website:${phone.source_url}`, confidence: 50 })
    }
  }

  // Sort by confidence
  return results.sort((a, b) => b.confidence - a.confidence)
}
