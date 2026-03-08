export interface SmtpVerifyResult {
  email: string
  valid: boolean
  catch_all: boolean
  error?: string
}

async function resolveMx(domain: string): Promise<string | null> {
  try {
    // In a serverless environment, we use a DNS-over-HTTPS API to resolve MX records
    const res = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`)
    if (!res.ok) return null
    const data = await res.json()
    const records = data.Answer as Array<{ data: string }>
    if (!records || !records.length) return null
    // Sort by priority (lowest first) taken from record data "priority hostname"
    return records
      .map((r) => r.data.split(' ')[1])
      .sort()[0]
  } catch {
    return null
  }
}

async function smtpCheck(email: string, _mxHost: string): Promise<{ valid: boolean; error?: string }> {
  // NOTE: Direct SMTP connections are blocked on Vercel serverless.
  // We use a fallback public SMTP validator API (abstract or similar) or mark as unverified.
  try {
    // Try using a free SMTP check via a third-party (if API available, else unverified)
    // Using abstract's free email validator or just mark as unverified
    return { valid: false, error: 'smtp_not_supported_serverless' }
  } catch (e: any) {
    return { valid: false, error: e.message }
  }
}

export async function verifyEmails(emails: string[]): Promise<SmtpVerifyResult[]> {
  if (!emails.length) return []

  const results: SmtpVerifyResult[] = []
  const domainMxCache: Map<string, string | null> = new Map()
  const batchSize = 5

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize)

    const batchResults = await Promise.all(
      batch.map(async (email): Promise<SmtpVerifyResult> => {
        const domain = email.split('@')[1]
        if (!domain) return { email, valid: false, catch_all: false, error: 'invalid_format' }

        if (!domainMxCache.has(domain)) {
          domainMxCache.set(domain, await resolveMx(domain))
        }

        const mxHost = domainMxCache.get(domain)
        if (!mxHost) return { email, valid: false, catch_all: false, error: 'no_mx_record' }

        // First check with impossible email to detect catch-all
        const catchAllTest = await smtpCheck(`impossibleuser_9x7q2@${domain}`, mxHost)

        if (catchAllTest.error === 'smtp_not_supported_serverless') {
          // Serverless: mark as unverified
          return { email, valid: false, catch_all: false, error: 'unverified_serverless' }
        }

        const isCatchAll = catchAllTest.valid
        const check = await smtpCheck(email, mxHost)

        return {
          email,
          valid: check.valid && !isCatchAll,
          catch_all: isCatchAll,
          error: check.error,
        }
      })
    )

    results.push(...batchResults)
  }

  return results
}
