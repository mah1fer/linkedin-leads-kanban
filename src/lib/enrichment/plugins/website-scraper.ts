/**
 * Website Scraper Plugin — sem API
 *
 * Raspa o site da empresa buscando emails e telefones em:
 * 1. Página principal
 * 2. /contato, /contact, /fale-conosco, /about, /sobre, /team, /equipe
 *
 * Também descobre o domínio corporativo a partir do nome da empresa
 * via DuckDuckGo (sem bloqueio por bot).
 */

import type { EnrichmentPlugin, LeadInput, EnrichmentResult, PhoneCandidate } from '../types';
import { extractEmails } from '../utils/email-extractor';

// Rotas comuns de contato para varrer
const CONTACT_PATHS = [
  '/contato', '/contact', '/fale-conosco', '/faleconosco',
  '/sobre', '/about', '/about-us', '/quem-somos',
  '/equipe', '/team', '/nossa-equipe',
];

const PHONE_REGEX = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?)?\d{4}[-\s]?\d{4}/g;

function extractPhones(text: string): string[] {
  const matches = text.match(PHONE_REGEX) || [];
  return [...new Set(
    matches
      .map(p => p.replace(/\s/g, '').trim())
      .filter(p => p.replace(/\D/g, '').length >= 8)
  )];
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('html')) return null;
    return res.text();
  } catch {
    return null;
  }
}

/**
 * Descobre o site oficial de uma empresa via DuckDuckGo Instant Answer API.
 * Gratuito, sem chave, sem bloqueio por bot.
 */
async function discoverCompanyDomain(companyName: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${companyName} site oficial`);
    const url = `https://api.duckduckgo.com/?q=${q}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = await res.json() as {
      AbstractURL?: string;
      Results?: { FirstURL?: string }[];
      RelatedTopics?: { FirstURL?: string }[];
    };

    const candidates: string[] = [];

    if (json.AbstractURL) candidates.push(json.AbstractURL);
    for (const r of json.Results || []) {
      if (r.FirstURL) candidates.push(r.FirstURL);
    }
    for (const r of json.RelatedTopics || []) {
      if (r.FirstURL) candidates.push(r.FirstURL);
    }

    for (const url of candidates) {
      try {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./, '');
        // Ignora resultados de redes sociais / agregadores
        const blocked = ['duckduckgo.com', 'wikipedia.org', 'linkedin.com', 'facebook.com',
          'instagram.com', 'twitter.com', 'youtube.com', 'google.com'];
        if (!blocked.some(b => host.includes(b)) && host.includes('.')) {
          return host;
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extrai o domínio de um URL de LinkedIn de empresa.
 * ex: linkedin.com/company/empresa-xyz → tenta buscar site externo
 */
async function getDomainFromLinkedIn(companyLinkedInUrl: string): Promise<string | null> {
  // Não conseguimos scrape do LinkedIn sem autenticação, então usamos DDG
  const slug = companyLinkedInUrl.replace(/\/$/, '').split('/').pop() || '';
  if (!slug) return null;
  return discoverCompanyDomain(slug.replace(/-/g, ' '));
}

export class WebsiteScraperPlugin implements EnrichmentPlugin {
  name = 'profile_direct' as const;

  async run(input: LeadInput): Promise<EnrichmentResult> {
    let domain = input.domain || null;

    // Tenta descobrir o domínio se não tiver
    if (!domain) {
      if (input.company) {
        domain = await discoverCompanyDomain(input.company);
      }
    }

    if (!domain) {
      return { emails: [], phones: [], source: 'profile_direct', rawData: {} };
    }

    const baseUrl = `https://${domain}`;
    const allEmails = new Set<string>();
    const allPhones = new Set<string>();

    // Raspa página principal + páginas de contato
    const urlsToScrape = [baseUrl, ...CONTACT_PATHS.map(p => `${baseUrl}${p}`)];

    let pagesFound = 0;
    for (const url of urlsToScrape) {
      if (pagesFound >= 4) break; // limita a 4 páginas para não demorar
      const html = await fetchPage(url);
      if (!html) continue;

      pagesFound++;
      const text = stripHtml(html);

      const emails = extractEmails(text);
      const phones = extractPhones(text);

      emails.forEach(e => allEmails.add(e));
      phones.forEach(p => allPhones.add(p));

      // Também extrai de mailto: direto no HTML
      const mailtoMatches = html.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g) || [];
      mailtoMatches.forEach(m => allEmails.add(m.replace('mailto:', '').toLowerCase()));

      // Encontrou coisas suficientes
      if (allEmails.size >= 3 && allPhones.size >= 1) break;

      await new Promise(r => setTimeout(r, 600));
    }

    // Filtra emails corporativos (prefere emails do domínio da empresa)
    const emailCandidates = [...allEmails].map(email => {
      const isCompanyEmail = email.endsWith(`@${domain}`);
      return {
        email,
        confidence: isCompanyEmail ? 0.65 : 0.35,
        verified: false,
        catchAll: false,
        patternMatch: false,
        sources: ['profile_direct' as const],
      };
    });

    // Normaliza telefones
    const phoneCandidates: PhoneCandidate[] = [...allPhones].map(phone => ({
      phone,
      confidence: 0.70,
      hasWhatsApp: false,
      type: 'company' as const,
      sources: ['profile_direct' as const],
    }));

    console.log(
      `[WebScraper] ${domain} — ${emailCandidates.length} emails, ${phoneCandidates.length} telefones (${pagesFound} páginas)`
    );

    return {
      emails: emailCandidates,
      phones: phoneCandidates,
      source: 'profile_direct',
      rawData: { domain, pagesScraped: pagesFound },
    };
  }
}

/**
 * Utilitário standalone para descobrir domínio a partir do nome da empresa.
 * Usado pela API de busca por empresa.
 */
export { discoverCompanyDomain };
