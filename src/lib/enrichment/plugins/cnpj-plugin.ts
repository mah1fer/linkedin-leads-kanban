import type { EnrichmentPlugin, LeadInput, EnrichmentResult, PhoneCandidate } from '../types';
import { normalizePhone, isMobileBR } from '../utils/phone-normalizer';
import { extractEmails } from '../utils/email-extractor';

interface CnpjData {
  cnpj: string;
  nome: string;
  fantasia: string;
  telefone: string;
  email: string;
  situacao: string;
  qsa: Array<{ nome: string; qual: string }>;
  cnae_fiscal_descricao: string;
}

export class CnpjPlugin implements EnrichmentPlugin {
  name = 'cnpj' as const;

  private async fetchByCnpj(cnpj: string): Promise<CnpjData | null> {
    const clean = cnpj.replace(/\D/g, '');
    const res = await fetch(`https://publica.cnpj.ws/cnpj/${clean}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return res.json();
  }

  private async searchByName(name: string): Promise<CnpjData | null> {
    try {
      const query = encodeURIComponent(name.slice(0, 60));
      const res = await fetch(
        `https://www.receitaws.com.br/v1/cnpj/search?query=${query}`,
        {
          headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(10000),
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      // Pega primeiro resultado ativo
      const first = data?.companies?.find((c: any) => c.status === 'ATIVA');
      if (!first?.cnpj) return null;
      return this.fetchByCnpj(first.cnpj);
    } catch {
      return null;
    }
  }

  async run(input: LeadInput): Promise<EnrichmentResult> {
    const phones: PhoneCandidate[] = [];
    const emails: any[] = [];

    try {
      const data = await this.searchByName(input.company);
      if (!data || data.situacao !== 'ATIVA') {
        return { emails: [], phones: [], source: 'cnpj', rawData: {} };
      }

      // Telefone da empresa
      if (data.telefone) {
        const normalized = normalizePhone(data.telefone);
        phones.push({
          phone: normalized,
          confidence: isMobileBR(normalized) ? 0.65 : 0.55,
          hasWhatsApp: false, // será verificado pelo WhatsAppChecker
          type: isMobileBR(normalized) ? 'mobile' : 'company',
          sources: ['cnpj'],
        });
      }

      // Email público do CNPJ
      if (data.email) {
        const foundEmails = extractEmails(data.email);
        foundEmails.forEach(email => {
          emails.push({
            email,
            confidence: 0.70,
            verified: false,
            catchAll: false,
            patternMatch: false,
            sources: ['cnpj'],
          });
        });
      }

      return { emails, phones, source: 'cnpj', rawData: data as any };
    } catch (err) {
      console.error('[CnpjPlugin]', err);
      return { emails: [], phones: [], source: 'cnpj', rawData: {} };
    }
  }
}
