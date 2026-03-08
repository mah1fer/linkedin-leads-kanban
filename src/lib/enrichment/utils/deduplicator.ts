import type { EmailCandidate, PhoneCandidate } from '../types';

export function deduplicateEmails(emails: EmailCandidate[]): EmailCandidate[] {
  const map = new Map<string, EmailCandidate>();

  for (const candidate of emails) {
    const key = candidate.email.toLowerCase();
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...candidate });
    } else {
      // Merge: combina sources, mantém maior confidence
      map.set(key, {
        ...existing,
        confidence: Math.max(existing.confidence, candidate.confidence),
        verified: existing.verified || candidate.verified,
        catchAll: existing.catchAll || candidate.catchAll,
        patternMatch: existing.patternMatch || candidate.patternMatch,
        sources: [...new Set([...existing.sources, ...candidate.sources])],
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.confidence - a.confidence);
}

export function deduplicatePhones(phones: PhoneCandidate[]): PhoneCandidate[] {
  const map = new Map<string, PhoneCandidate>();

  for (const candidate of phones) {
    const key = candidate.phone.replace(/\D/g, '');
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...candidate });
    } else {
      map.set(key, {
        ...existing,
        confidence: Math.max(existing.confidence, candidate.confidence),
        hasWhatsApp: existing.hasWhatsApp || candidate.hasWhatsApp,
        sources: [...new Set([...existing.sources, ...candidate.sources])],
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.confidence - a.confidence);
}
