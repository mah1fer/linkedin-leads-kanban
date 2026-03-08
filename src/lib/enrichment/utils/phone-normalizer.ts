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
