import type { EnrichmentPlugin, LeadInput, EnrichmentResult, EmailCandidate } from '../types';
import { getDomain } from '../utils/email-extractor';

type SmtpResult = 'valid' | 'invalid' | 'catch-all' | 'unknown';

export class SmtpVerifierPlugin implements EnrichmentPlugin {
  name = 'smtp_verified' as const;

  // Usa API externa porque Vercel bloqueia TCP porta 25
  // ZeroBounce: 100 verificações gratuitas/mês
  // Configure ZEROBOUNCE_API_KEY no .env
  private async verifyViaAPI(email: string): Promise<SmtpResult> {
    const apiKey = process.env.ZEROBOUNCE_API_KEY;

    if (!apiKey) {
      // Fallback: verificação básica por MX record
      return this.verifyViaMX(email);
    }

    try {
      const res = await fetch(
        `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${encodeURIComponent(email)}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const data = await res.json();

      if (data.status === 'valid') return 'valid';
      if (data.status === 'catch-all') return 'catch-all';
      return 'invalid';
    } catch {
      return 'unknown';
    }
  }

  // Fallback: apenas verifica se o domínio tem registro MX
  private async verifyViaMX(email: string): Promise<SmtpResult> {
    const domain = getDomain(email);
    if (!domain) return 'invalid';

    try {
      // Usa DNS over HTTPS (funciona no Vercel)
      const res = await fetch(
        `https://dns.google/resolve?name=${domain}&type=MX`,
        { signal: AbortSignal.timeout(5000) }
      );
      const data = await res.json();
      const hasMX = data.Answer && data.Answer.length > 0;
      return hasMX ? 'unknown' : 'invalid'; // "unknown" = tem MX mas não verificamos RCPT
    } catch {
      return 'unknown';
    }
  }

  async runBatch(emails: EmailCandidate[]): Promise<EmailCandidate[]> {
    const results: EmailCandidate[] = [];

    for (const candidate of emails) {
      // Só verifica os mais promissores para não desperdiçar cota
      if (candidate.confidence < 0.30) {
        results.push(candidate);
        continue;
      }

      const result = await this.verifyViaAPI(candidate.email);

      results.push({
        ...candidate,
        verified: result === 'valid',
        catchAll: result === 'catch-all',
        sources: result === 'valid'
          ? [...candidate.sources, 'smtp_verified']
          : candidate.sources,
      });
    }

    return results;
  }

  async run(input: LeadInput): Promise<EnrichmentResult> {
    // Este plugin é chamado separadamente via runBatch no orchestrator
    return { emails: [], phones: [], source: 'smtp_verified', rawData: {} };
  }
}
