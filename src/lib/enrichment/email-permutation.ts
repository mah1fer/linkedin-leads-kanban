export function generateEmailPermutations(
  firstName: string,
  lastName: string,
  domain: string
): string[] {
  const WEBMAIL_DOMAINS = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 'uol.com.br', 'bol.com.br', 'terra.com.br']
  const isWebmail = WEBMAIL_DOMAINS.includes(domain.toLowerCase())

  const f = firstName.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  const l = lastName.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  const fi = f.charAt(0)
  const li = l.charAt(0)

  const patterns: string[] = [
    `${f}.${l}`,
    `${f}${l}`,
    `${f}`,
    `${f}${li}`,
    `${fi}${l}`,
    `${fi}.${l}`,
  ]

  if (!isWebmail) {
    patterns.push(
      `${l}.${f}`,
      `${l}${fi}`,
      `${l}`,
      `${f}_${l}`,
      `${f}-${l}`,
      `${fi}${li}`,
      `${f}.${li}`,
      `${fi}${l}${fi}`,
    )
  }

  return [...new Set(patterns)].map((pattern) => `${pattern}@${domain}`)
}
