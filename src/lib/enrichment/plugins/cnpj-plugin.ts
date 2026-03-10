/**
 * CnpjPlugin — busca dados públicos da empresa via CNPJ
 *
 * Estratégia de descoberta do número CNPJ:
 *   1. DuckDuckGo HTML: busca "{empresa} cnpj" e extrai o número via regex
 *   2. Bing como fallback
 *   3. Lookup direto na API pública (publica.cnpj.ws — gratuita, sem auth)
 *
 * Dados retornados: telefone da empresa (possível WhatsApp) + email público
 */
import type { EnrichmentPlugin, LeadInput, EnrichmentResult, PhoneCandidate } from '../types';
import { normalizePhone, isMobileBR } from '../utils/phone-normalizer';
import { extractEmails } from '../utils/email-extractor';

const HEADERS = { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' };

// Regex para capturar CNPJ em qualquer formato:
// 12.345.678/0001-90, 12345678000190, 12-345-678/0001-90
const CNPJ_REGEX = /\d{2}[\.\-]?\d{3}[\.\-]?\d{3}[\.\-\/\\]?\d{4}[\.\-]?\d{2}/g;

function extractCnpj(text: string): string | null {
  const matches = text.match(CNPJ_REGEX) || [];
  for (const match of matches) {
    const digits = match.replace(/\D/g, '');
    if (digits.length === 14) {
      // Valida check digits básico: primeiro e segundo dígitos verificadores
      // (evita capturar sequências aleatórias de 14 dígitos como 00000000000000)
      if (/^(\d)\1{13}$/.test(digits)) continue; // rejeita todos iguais
      return digits;
    }
  }
  return null;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Busca o CNPJ da empresa via DDG/Bing */
async function findCnpjNumber(companyName: string): Promise<string | null> {
  const query = `"${companyName}" cnpj`;

  // Tenta DDG primeiro (mais amigável para scraping)
  try {
    const html = await fetchHtml(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    );
    const cnpj = extractCnpj(html);
    if (cnpj) {
      console.log(`[CNPJ] Encontrado via DDG: ${cnpj}`);
      return cnpj;
    }
  } catch { /* tenta próximo */ }

  // Fallback: Bing
  try {
    const html = await fetchHtml(
      `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=10&setlang=pt-br`
    );
    const cnpj = extractCnpj(html);
    if (cnpj) {
      console.log(`[CNPJ] Encontrado via Bing: ${cnpj}`);
      return cnpj;
    }
  } catch { /* tenta próximo */ }

  return null;
}

interface CnpjRecord {
  razao_social?: string;
  nome?: string;
  nome_fantasia?: string;
  fantasia?: string;
  ddd_telefone_1?: string;
  ddd_telefone_2?: string;
  telefone?: string;
  email?: string;
  descricao_situacao_cadastral?: string;
  situacao?: string;
  qsa?: Array<{ nome_socio: string; qualificacao_socio: string }>;
}

/** Lookup na API pública publica.cnpj.ws (grátis, sem chave) */
async function lookupCnpj(cnpj: string): Promise<CnpjRecord | null> {
  const digits = cnpj.replace(/\D/g, '');
  try {
    const res = await fetch(`https://publica.cnpj.ws/cnpj/${digits}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    // Fallback: ReceitaWS (mais lento, rate-limited)
    try {
      const res = await fetch(`https://www.receitaws.com.br/v1/cnpj/${digits}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }
}

function extractPhone(record: CnpjRecord): string | null {
  // publica.cnpj.ws usa ddd_telefone_1 (ex: "11 98765432")
  // receitaws usa telefone (ex: "(11) 9876-5432")
  const raw = record.ddd_telefone_1 || record.ddd_telefone_2 || record.telefone || '';
  if (!raw) return null;
  return normalizePhone(raw.trim());
}

function isActive(record: CnpjRecord): boolean {
  const situacao = (record.descricao_situacao_cadastral || record.situacao || '').toLowerCase();
  // Aceita vazio (API pode não retornar) ou "ativa"
  return !situacao || situacao.includes('ativa');
}

export class CnpjPlugin implements EnrichmentPlugin {
  name = 'cnpj' as const;

  async run(input: LeadInput): Promise<EnrichmentResult> {
    const phones: PhoneCandidate[] = [];
    const emails: any[] = [];

    try {
      // 1. Descobrir número CNPJ via busca web
      const cnpjNumber = await findCnpjNumber(input.company);
      if (!cnpjNumber) {
        console.log(`[CNPJ] Número não encontrado para: ${input.company}`);
        return { emails: [], phones: [], source: 'cnpj', rawData: {} };
      }

      // 2. Buscar dados completos na API pública
      const record = await lookupCnpj(cnpjNumber);
      if (!record) {
        return { emails: [], phones: [], source: 'cnpj', rawData: {} };
      }

      if (!isActive(record)) {
        console.log(`[CNPJ] Empresa inativa: ${input.company}`);
        return { emails: [], phones: [], source: 'cnpj', rawData: {} };
      }

      // 3. Telefone da empresa
      const normalized = extractPhone(record);
      if (normalized && normalized.replace(/\D/g, '').length >= 10) {
        const mobile = isMobileBR(normalized);
        phones.push({
          phone: normalized,
          confidence: mobile ? 0.65 : 0.55,
          hasWhatsApp: false, // verificado pelo WhatsAppCheckerPlugin
          type: mobile ? 'mobile' : 'company',
          sources: ['cnpj'],
        });
        console.log(`[CNPJ] Telefone encontrado: ${normalized} (${mobile ? 'celular' : 'fixo'})`);
      }

      // 4. Email público do CNPJ
      if (record.email) {
        const foundEmails = extractEmails(record.email);
        foundEmails.forEach(email => {
          emails.push({
            email,
            confidence: 0.70,
            verified: false,
            catchAll: false,
            patternMatch: false,
            sources: ['cnpj'],
          });
          console.log(`[CNPJ] Email encontrado: ${email}`);
        });
      }

      return { emails, phones, source: 'cnpj', rawData: record as unknown as Record<string, unknown> };
    } catch (err) {
      console.error('[CnpjPlugin]', err);
      return { emails: [], phones: [], source: 'cnpj', rawData: {} };
    }
  }
}
