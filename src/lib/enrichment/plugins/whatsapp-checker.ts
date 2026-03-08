import type { EnrichmentPlugin, LeadInput, EnrichmentResult, PhoneCandidate } from '../types';
import { isMobileBR } from '../utils/phone-normalizer';

export class WhatsAppCheckerPlugin implements EnrichmentPlugin {
  name = 'whatsapp_check' as const;

  private async checkHeuristic(phone: string): Promise<boolean> {
    // Heurística: celulares brasileiros com 9 dígito têm ~85% de chance de ter WA
    const digits = phone.replace(/\D/g, '');
    return isMobileBR(digits);
  }

  private async checkViaAPI(phone: string): Promise<boolean> {
    const apiKey = process.env.NUMLOOKUP_API_KEY;
    if (!apiKey) return this.checkHeuristic(phone);

    try {
      const digits = phone.replace(/\D/g, '');
      const e164 = digits.startsWith('55') ? `+${digits}` : `+55${digits}`;
      const res = await fetch(
        `https://api.numlookupapi.com/v1/info/${e164}?apikey=${apiKey}`,
        { signal: AbortSignal.timeout(8000) }
      );
      const data = await res.json();
      // Retorna true se for linha móvel (altíssima chance de ter WA no Brasil)
      return data.line_type === 'mobile';
    } catch {
      return this.checkHeuristic(phone);
    }
  }

  async run(input: LeadInput): Promise<EnrichmentResult> {
    const phones: PhoneCandidate[] = [];

    for (const candidate of input.phoneCandidates || []) {
      const hasWA = await this.checkViaAPI(candidate.phone);

      phones.push({
        ...candidate,
        hasWhatsApp: hasWA,
        confidence: hasWA ? Math.min(candidate.confidence + 0.20, 0.90) : candidate.confidence,
        sources: hasWA
          ? [...candidate.sources, 'whatsapp_check']
          : candidate.sources,
      });
    }

    return { emails: [], phones, source: 'whatsapp_check', rawData: {} };
  }
}
