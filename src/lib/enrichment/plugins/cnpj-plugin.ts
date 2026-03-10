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

const HEADERS = { 'Accept': 'application/json', 'User-Agent': 'mozilla/5.0' };

/**
 * Busca dados via publica.cnpj.ws (API gratuita e sem limite declarado)
 */
async function fetchByCnpj(cnpj: string): Promise<CnpjData | null> {
  const clean = cnpj.replace(/\D/g, '');
  try {
    const res = await fetch(`https://publica.cnpj.ws/cnpj/${clean}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    // publica.cnpj.ws usa formato ligeiramente diferente
    return {
      cnpj: d.cnpj || clean,
      nome: d.razao_social || d.nome || '',
      fantasia: d.nome_fantasia || d.fantasia || '',
      telefone: d.ddd_telefone_1 || d.telefone || '',
      email: d.email || '',
      situacao: d.descricao_situacao_cadastral || d.situacao || '',
      qsa: d.qsa || [],
      cnae_fiscal_descricao: d.cnae_fiscal_descricao || '',
    };
  } catch {
    return null;
  }
}

/**
 * Estratégia 1: ReceitaWS search by company name (pode ser premium)
 */
async function searchReceitaWS(name: string): Promise<CnpjData | null> {
  try {
    const query = encodeURIComponent(name.slice(0, 60));
    const res = await fetch(
      `https://www.receitaws.com.br/v1/cnpj/search?query=${query}`,
      { headers: HEADERS, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.companies?.find((c: any) => c.status === 'ATIVA');
    if (!first?.cnpj) return null;
    return fetchByCnpj(first.cnpj);
  } catch {
    return null;
  }
}

/**
 * Estratégia 2: BrasilAPI search (gratuita, sem auth)
 * Usa o endpoint de CNPJ por query que retorna resultado paginado
 */
async function searchBrasilAPI(name: string): Promise<CnpjData | null> {
  try {
    const query = encodeURIComponent(name.slice(0, 60));
    const res = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/search?query=${query}&page=1&size=5`,
      { headers: HEADERS, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // BrasilAPI retorna { data: [...] }
    const companies = data?.data || data;
    if (!Array.isArray(companies) || companies.length === 0) return null;
    const first = companies.find((c: any) =>
      (c.descricao_situacao_cadastral || '').toLowerCase() === 'ativa' ||
      (c.situacao || '').toLowerCase() === 'ativa'
    ) || companies[0];
    if (!first?.cnpj) return null;
    return fetchByCnpj(first.cnpj.replace(/\D/g, ''));
  } catch {
    return null;
  }
}

/**
 * Estratégia 3: Minha Receita (API pública alternativa)
 */
async function searchMinhaReceita(name: string): Promise<CnpjData | null> {
  try {
    const query = encodeURIComponent(name.slice(0, 60));
    const res = await fetch(
      `https://minhareceita.org/company?q=${query}&limit=5`,
      { headers: HEADERS, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const companies = data?.results || data;
    if (!Array.isArray(companies) || companies.length === 0) return null;
    const first = companies[0];
    if (!first?.cnpj) return null;
    return fetchByCnpj(first.cnpj);
  } catch {
    return null;
  }
}

export class CnpjPlugin implements EnrichmentPlugin {
  name = 'cnpj' as const;

  private async searchByName(name: string): Promise<CnpjData | null> {
    // Tenta cada estratégia em ordem até uma funcionar
    return (
      (await searchReceitaWS(name)) ||
      (await searchBrasilAPI(name)) ||
      (await searchMinhaReceita(name))
    );
  }

  private buildPhone(raw: string): PhoneCandidate | null {
    if (!raw) return null;
    // DDD pode vir separado: "11" + "98765432"
    const normalized = normalizePhone(raw);
    if (!normalized || normalized.replace(/\D/g, '').length < 10) return null;
    const mobile = isMobileBR(normalized);
    return {
      phone: normalized,
      confidence: mobile ? 0.65 : 0.55,
      hasWhatsApp: false,
      type: mobile ? 'mobile' : 'company',
      sources: ['cnpj'],
    };
  }

  async run(input: LeadInput): Promise<EnrichmentResult> {
    const phones: PhoneCandidate[] = [];
    const emails: any[] = [];

    try {
      const data = await this.searchByName(input.company);
      if (!data) return { emails: [], phones: [], source: 'cnpj', rawData: {} };

      const situacao = (data.situacao || '').toLowerCase();
      if (situacao && !situacao.includes('ativa')) {
        return { emails: [], phones: [], source: 'cnpj', rawData: {} };
      }

      // Telefones: pode vir como "11 98765432" ou apenas "98765432"
      const rawPhone = data.telefone || '';
      const ph = this.buildPhone(rawPhone);
      if (ph) phones.push(ph);

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
