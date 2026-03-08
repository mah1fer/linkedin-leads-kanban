import type { EnrichmentPlugin, LeadInput, EnrichmentResult, EmailCandidate } from '../types';
import { extractEmails } from '../utils/email-extractor';

export interface GoogleDorkSearchResult {
  social_profiles: { url: string; name?: string }[];
  emails: string[];
}

export async function googleDorkSearch(
  company: string,
  role: string,
  options: { forSocial?: boolean } = {}
): Promise<GoogleDorkSearchResult> {
  const social_profiles: { url: string; name?: string }[] = [];
  const emails: string[] = [];

  const queries = options.forSocial
    ? [
        `"${company}" "${role}" site:linkedin.com/in/`,
        `"${company}" site:linkedin.com/in/ "${role}"`,
      ]
    : [
        `"${company}" "${role}" email`,
        `"${company}" "${role}" contato`,
      ];

  for (const query of queries.slice(0, 2)) {
    try {
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) continue;
      const html = await res.text();

      if (options.forSocial) {
        const linkedinRegex = /https?:\/\/(?:www\.)?linkedin\.com\/in\/[\w-]+\/?/g;
        const matches = html.match(linkedinRegex) || [];
        for (const profileUrl of matches) {
          if (!social_profiles.some(p => p.url === profileUrl)) {
            social_profiles.push({ url: profileUrl });
          }
        }
      } else {
        const foundEmails = extractEmails(html);
        emails.push(...foundEmails.filter(e => !emails.includes(e)));
      }
    } catch {
      // ignore individual query failures
    }
  }

  return { social_profiles, emails };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildGoogleUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10`;
}

export class GoogleDorkPlugin implements EnrichmentPlugin {
  name = 'google_dork' as const;

  private buildQueries(name: string, company: string, domain?: string): string[] {
    const queries = [
      `"${name}" "${company}" email`,
      `"${name}" "${company}" contato OR contact`,
    ];

    if (domain) {
      queries.push(`"${name}" "@${domain}"`);
      queries.push(`"${name}" site:linkedin.com "${company}"`);
    }

    return queries;
  }

  private async fetchPage(url: string): Promise<string> {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    ];

    const res = await fetch(url, {
      headers: {
        'User-Agent': userAgents[randomBetween(0, userAgents.length - 1)],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }

  async run(input: LeadInput): Promise<EnrichmentResult> {
    const emails: EmailCandidate[] = [];
    const queries = this.buildQueries(input.name, input.company, input.domain);

    // Executa no máximo 2 queries para evitar bloqueio no Vercel
    const queriesToRun = queries.slice(0, 2);

    for (const query of queriesToRun) {
      try {
        await sleep(randomBetween(1500, 3500)); // anti-detecção
        const html = await this.fetchPage(buildGoogleUrl(query));
        const found = extractEmails(html);

        found.forEach(email => {
          emails.push({
            email,
            confidence: 0.40,
            verified: false,
            catchAll: false,
            patternMatch: false,
            sources: ['google_dork'],
          });
        });
      } catch (err) {
        console.warn(`[GoogleDork] Query falhou: ${query}`, err);
      }
    }

    return { emails, phones: [], source: 'google_dork', rawData: {} };
  }
}
