// Extrai possíveis números de telefone de um texto livre
export function extractPhones(text: string): string[] {
  const phones = new Set<string>();

  // Padrão 1: com código do país +55
  const withCountry = text.match(/\+55[\s\-\.]?\(?\d{2}\)?[\s\-\.]?\d[\s\-\.]?\d{3,4}[\s\-\.]?\d{4}/g) || [];
  // Padrão 2: com DDD entre parênteses (11) 98765-4321
  const withParens = text.match(/\(\d{2}\)\s?9?\s?\d{4}[\s\-\.]?\d{4}/g) || [];
  // Padrão 3: DDD seguido de celular 11 98765-4321 ou 11987654321
  const withDDD = text.match(/\b[1-9]\d[\s\-\.]9\d{3,4}[\s\-\.]?\d{4}\b/g) || [];

  for (const raw of [...withCountry, ...withParens, ...withDDD]) {
    const digits = raw.replace(/\D/g, '');
    // Válido: 10 dígitos (fixo c/ DDD) ou 11 (celular c/ DDD) ou 12-13 (c/ código país)
    if (digits.length >= 10 && digits.length <= 13) {
      phones.add(raw.trim());
    }
  }

  return [...phones];
}

// Normaliza telefone brasileiro para E.164
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');

  // Já tem código do país
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`;

  // 11 dígitos: celular com 9 (ex: 11987654321)
  if (digits.length === 11) return `+55${digits}`;

  // 10 dígitos: fixo sem 9 (ex: 1187654321)
  if (digits.length === 10) return `+55${digits}`;

  // DDD + 8 dígitos fixo antigo
  if (digits.length === 9) return `+5511${digits}`;

  return `+55${digits}`;
}

export function isMobileBR(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  // Celulares brasileiros: após DDD, começam com 9
  const local = digits.slice(-9);
  return local.startsWith('9') && local.length === 9;
}

export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  // +55 11 98765-4321
  const digits = normalized.replace(/\D/g, '');
  if (digits.length === 13) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return normalized;
}
