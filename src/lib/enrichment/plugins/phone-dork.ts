/**
 * Phone Dork Plugin
 *
 * Busca número de telefone/WhatsApp pessoal do profissional via DuckDuckGo.
 * Sem API, sem custo. Funciona buscando menções públicas do nome + empresa.
 *
 * Fontes consultadas via busca:
 * - Portais de negócios (Econodata, Linkedin, Yelp BR equivalents)
 * - Redes sociais com telefone público
 * - Sites pessoais e portfólios
 * - Grupos de WhatsApp listados publicamente
 *
 * Limitações: encontra principalmente números públicos/comerciais.
 * Para WhatsApp pessoal, a assertividade é ~30-40%.
 */

import type { EnrichmentPlugin, LeadInput, EnrichmentResult, PhoneCandidate } from '../types';
import { normalizePhone, isMobileBR } from '../utils/phone-normalizer';

// Regex abrangente para números BR: (11) 99999-9999, +55 11 99999-9999, etc.
const PHONE_REGEX =
  /(?:\+?55[\s.-]?)?(?:\(?0?(?:[1-9]{2})\)?[\s.-]?)(?:9[\s.-]?\d{4}|\d{4})[\s.-]?\d{4}/g;

function extractPhones(text: string): string[] {
  const matches = text.match(PHONE_REGEX) || [];
  return [...new Set(
    matches
      .map(p => p.replace(/\s/g, '').trim())
      .filter(p => p.replace(/\D/g, '').length >= 10)
  )];
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function duckDuckGoSearch(query: string): Promise<string[]> {
  const phones: string[] = [];

  try {
    const q = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${q}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];

    const html = await res.text();
    const text = stripHtml(html);
    const found = extractPhones(text);
    phones.push(...found);
  } catch {
    // silencia falhas de rede
  }

  return phones;
}

export class PhoneDorkPlugin implements EnrichmentPlugin {
  name = 'phone_dork' as const;

  private buildQueries(name: string, company: string): string[] {
    return [
      // Busca por nome + empresa + termos de contato
      `"${name}" "${company}" whatsapp`,
      `"${name}" "${company}" celular OR telefone`,
    ];
  }

  async run(input: LeadInput): Promise<EnrichmentResult> {
    const phones: PhoneCandidate[] = [];
    const seenPhones = new Set<string>();

    const queries = this.buildQueries(input.name, input.company);

    for (const query of queries) {
      // Delay anti-detecção
      await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1500) + 800));

      const found = await duckDuckGoSearch(query);

      for (const raw of found) {
        const normalized = normalizePhone(raw);
        const digits = normalized.replace(/\D/g, '');

        // Ignora números inválidos (muito curtos ou claramente errados)
        if (digits.length < 10 || digits.length > 13) continue;
        if (seenPhones.has(normalized)) continue;

        seenPhones.add(normalized);
        const isMobile = isMobileBR(normalized);

        phones.push({
          phone: normalized,
          // Confiança moderada: veio de busca pública, pode ser da empresa e não pessoal
          confidence: isMobile ? 0.40 : 0.30,
          hasWhatsApp: isMobile, // heurística: celular BR → provável WhatsApp
          type: isMobile ? 'mobile' : 'unknown',
          sources: ['phone_dork'],
        });
      }

      // Limita a 3 números para não poluir com resultados irrelevantes
      if (phones.length >= 3) break;
    }

    console.log(`[PhoneDork] ${input.name}: ${phones.length} telefones encontrados`);

    return { emails: [], phones, source: 'phone_dork', rawData: {} };
  }
}
