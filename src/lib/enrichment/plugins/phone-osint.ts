/**
 * PhoneOsintPlugin
 * Busca números de telefone associados à pessoa via:
 *   1. DuckDuckGo HTML (mais permissivo com scraping)
 *   2. Bing (fallback)
 *   3. GitHub API (perfil público — email/bio/blog)
 *
 * Extrai números brasileiros com regex e normaliza para E.164.
 * Números móveis recebem confidence maior (mais chance de ser WhatsApp).
 */
import type { EnrichmentPlugin, LeadInput, EnrichmentResult, PhoneCandidate } from '../types';
import { extractPhones, normalizePhone, isMobileBR } from '../utils/phone-normalizer';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const UA = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA[rand(0, UA.length - 1)],
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function searchDDG(query: string): Promise<string> {
  return fetchHtml(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
}

async function searchBing(query: string): Promise<string> {
  return fetchHtml(`https://www.bing.com/search?q=${encodeURIComponent(query)}&count=10&setlang=pt-br`);
}

/** Busca o perfil GitHub pelo nome e extrai telefones do bio/blog/location */
async function searchGitHub(name: string, company: string): Promise<string[]> {
  const phones: string[] = [];
  try {
    const q = encodeURIComponent(`${name} ${company}`);
    const res = await fetch(
      `https://api.github.com/search/users?q=${q}&per_page=5`,
      {
        headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'linkedin-leads-kanban' },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return phones;
    const data = await res.json();

    for (const user of (data.items || []).slice(0, 3)) {
      try {
        const profileRes = await fetch(
          `https://api.github.com/users/${user.login}`,
          {
            headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'linkedin-leads-kanban' },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (!profileRes.ok) continue;
        const profile = await profileRes.json();
        const bio = [profile.bio, profile.blog, profile.location, profile.twitter_username]
          .filter(Boolean).join(' ');
        phones.push(...extractPhones(bio));
      } catch { /* ignore individual profile errors */ }
    }
  } catch { /* ignore */ }
  return phones;
}

export class PhoneOsintPlugin implements EnrichmentPlugin {
  name = 'phone_osint' as const;

  private buildQueries(name: string, company: string): string[] {
    return [
      `"${name}" "${company}" celular OR telefone`,
      `"${name}" "${company}" whatsapp`,
      `"${name}" "${company}" "+55"`,
    ];
  }

  async run(input: LeadInput): Promise<EnrichmentResult> {
    const phones: PhoneCandidate[] = [];
    const seen = new Set<string>();

    const addPhone = (raw: string, source: 'phone_osint', baseConfidence: number) => {
      const normalized = normalizePhone(raw);
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      const isMobile = isMobileBR(normalized);
      phones.push({
        phone: normalized,
        // celulares têm maior probabilidade de ser WhatsApp
        confidence: isMobile ? baseConfidence + 0.10 : baseConfidence,
        hasWhatsApp: false, // será verificado pelo WhatsAppCheckerPlugin
        type: isMobile ? 'mobile' : 'unknown',
        sources: [source],
      });
    };

    const queries = this.buildQueries(input.name, input.company);

    // Roda 2 queries no máximo para evitar bloqueio
    for (const query of queries.slice(0, 2)) {
      try {
        await sleep(rand(1200, 2800));

        let html = '';
        try {
          html = await searchDDG(query);
        } catch {
          try {
            html = await searchBing(query);
          } catch {
            continue;
          }
        }

        for (const raw of extractPhones(html)) {
          addPhone(raw, 'phone_osint', 0.45);
        }
      } catch (err) {
        console.warn(`[PhoneOsint] Query falhou: "${query}"`, err);
      }
    }

    // GitHub: fonte mais confiável — número aparece em perfil real
    try {
      const ghPhones = await searchGitHub(input.name, input.company);
      for (const raw of ghPhones) {
        addPhone(raw, 'phone_osint', 0.55); // confidence levemente maior
      }
    } catch { /* ignore */ }

    return { emails: [], phones, source: 'phone_osint', rawData: {} };
  }
}
