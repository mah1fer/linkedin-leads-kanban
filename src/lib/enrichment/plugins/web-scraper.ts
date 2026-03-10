/**
 * WebScraperPlugin
 * Scraping direcionado para contatos em fontes primárias:
 *
 *   1. Clearbit Autocomplete (grátis, sem chave) → descobre domínio real da empresa
 *   2. Site da empresa — tenta /contato /equipe /sobre /time /contact /about
 *      → busca o nome da pessoa e extrai email/telefone próximos
 *   3. Sites pessoais passados via input.personalSiteUrls
 *      (ex: portfólio, site pessoal linkado no LinkedIn)
 *
 * Confidence maior que Google Dork porque o contato está numa fonte primária.
 */
import type { EnrichmentPlugin, LeadInput, EnrichmentResult, EmailCandidate, PhoneCandidate } from '../types';
import { extractEmails } from '../utils/email-extractor';
import { extractPhones, normalizePhone, isMobileBR } from '../utils/phone-normalizer';

const COMPANY_PAGES = [
  '/contato', '/equipe', '/sobre', '/time', '/quem-somos',
  '/contact', '/about', '/team', '/about-us', '/staff',
];

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Usa Clearbit Autocomplete (grátis, sem auth) para descobrir o domínio real da empresa */
async function discoverDomain(company: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(company)}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0]?.domain || null;
  } catch {
    return null;
  }
}

/**
 * Extrai um trecho de texto (±300 chars) em volta do nome da pessoa dentro do HTML.
 * Isso aumenta a precisão: apenas contatos próximos ao nome são retornados.
 */
function extractContextAround(html: string, name: string, windowSize = 300): string {
  // Remove tags HTML para facilitar a busca
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const nameParts = name.toLowerCase().split(' ').filter(p => p.length > 2);
  if (nameParts.length === 0) return text.slice(0, 2000); // fallback

  const lower = text.toLowerCase();

  // Procura pelo primeiro nome + sobrenome juntos
  let idx = lower.indexOf(nameParts[0]);
  for (const part of nameParts) {
    const pos = lower.indexOf(part);
    if (pos !== -1) {
      // Verifica se outra parte do nome está perto (dentro de 60 chars)
      const nearby = lower.slice(pos, pos + 60);
      if (nameParts.some(p => p !== part && nearby.includes(p))) {
        idx = pos;
        break;
      }
    }
  }

  if (idx === -1) return ''; // nome não encontrado na página
  const start = Math.max(0, idx - windowSize);
  const end = Math.min(text.length, idx + windowSize);
  return text.slice(start, end);
}

/** Tenta scraping de uma URL e extrai emails e telefones (com contexto do nome) */
async function scrapeUrl(
  url: string,
  personName: string,
  confidence: number
): Promise<{ emails: EmailCandidate[]; phones: PhoneCandidate[] }> {
  const emails: EmailCandidate[] = [];
  const phones: PhoneCandidate[] = [];

  let html = '';
  try {
    html = await fetchHtml(url);
  } catch {
    return { emails, phones };
  }

  // Se a página tem o nome da pessoa, extrai apenas o contexto próximo
  const context = extractContextAround(html, personName);
  const searchText = context || html; // fallback para HTML inteiro se nome não encontrado
  const contextConfidence = context ? confidence : confidence - 0.15; // penaliza se não achou o nome

  for (const email of extractEmails(searchText)) {
    emails.push({
      email,
      confidence: contextConfidence,
      verified: false,
      catchAll: false,
      patternMatch: false,
      sources: ['web_scraper'],
    });
  }

  for (const raw of extractPhones(searchText)) {
    const normalized = normalizePhone(raw);
    if (!normalized) continue;
    const isMobile = isMobileBR(normalized);
    phones.push({
      phone: normalized,
      confidence: isMobile ? contextConfidence + 0.05 : contextConfidence,
      hasWhatsApp: false,
      type: isMobile ? 'mobile' : 'unknown',
      sources: ['web_scraper'],
    });
  }

  return { emails, phones };
}

export class WebScraperPlugin implements EnrichmentPlugin {
  name = 'web_scraper' as const;

  async run(input: LeadInput): Promise<EnrichmentResult> {
    const allEmails: EmailCandidate[] = [];
    const allPhones: PhoneCandidate[] = [];
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();

    const addResults = (emails: EmailCandidate[], phones: PhoneCandidate[]) => {
      for (const e of emails) {
        if (!seenEmails.has(e.email)) { seenEmails.add(e.email); allEmails.push(e); }
      }
      for (const p of phones) {
        if (!seenPhones.has(p.phone)) { seenPhones.add(p.phone); allPhones.push(p); }
      }
    };

    // ── 1. Descobrir domínio real via Clearbit ──────────────────────────────────
    let domain = input.domain;
    if (!domain && input.company) {
      try {
        domain = await discoverDomain(input.company) || undefined;
      } catch { /* usa fallback abaixo */ }
    }

    // ── 2. Scraping do site da empresa ─────────────────────────────────────────
    if (domain) {
      const baseUrl = `https://${domain.replace(/^https?:\/\//, '')}`;

      // Tenta até 3 páginas de equipe/contato com timeout rápido
      let scraped = 0;
      for (const page of COMPANY_PAGES) {
        if (scraped >= 3) break;
        try {
          const result = await scrapeUrl(`${baseUrl}${page}`, input.name, 0.60);
          addResults(result.emails, result.phones);
          if (result.emails.length > 0 || result.phones.length > 0) scraped++;
        } catch { /* página não existe, tenta próxima */ }
      }
    }

    // ── 3. Sites pessoais do lead ───────────────────────────────────────────────
    for (const url of input.personalSiteUrls || []) {
      try {
        // Site pessoal = confidence maior (0.70)
        const result = await scrapeUrl(url, input.name, 0.70);
        addResults(result.emails, result.phones);
      } catch { /* ignore */ }
    }

    return { emails: allEmails, phones: allPhones, source: 'web_scraper', rawData: { domain } };
  }
}
