/**
 * Apollo.io Plugin
 *
 * Busca email e telefone direto do profissional via Apollo.io API.
 * Plano gratuito: 50 exportações/mês (créditos de phone reveal).
 *
 * Documentação: https://apolloio.github.io/apollo-api-docs/
 *
 * Configuração:
 *   APOLLO_API_KEY=sua_chave_aqui
 *
 * Como obter:
 *   1. Crie conta em app.apollo.io
 *   2. Vá em Settings → API Keys
 *   3. Gere uma chave e cole no .env.local
 */

import type { EnrichmentPlugin, LeadInput, EnrichmentResult, PhoneCandidate, EmailCandidate } from '../types';
import { normalizePhone, isMobileBR } from '../utils/phone-normalizer';

interface ApolloPersonResult {
  email?: string;
  phone_numbers?: Array<{
    raw_number: string;
    sanitized_number: string;
    type?: string;
  }>;
  linkedin_url?: string;
}

interface ApolloSearchResponse {
  people?: ApolloPersonResult[];
  person?: ApolloPersonResult;
}

export class ApolloPlugin implements EnrichmentPlugin {
  name = 'apollo' as const;

  private apiKey = process.env.APOLLO_API_KEY;

  private async searchPerson(input: LeadInput): Promise<ApolloPersonResult | null> {
    if (!this.apiKey) return null;

    try {
      // Tenta buscar por LinkedIn URL primeiro (mais preciso)
      if (input.linkedinUrl) {
        const res = await fetch('https://api.apollo.io/v1/people/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': this.apiKey,
          },
          body: JSON.stringify({
            linkedin_url: input.linkedinUrl,
            reveal_personal_emails: true,
            reveal_phone_number: true,
          }),
          signal: AbortSignal.timeout(12000),
        });

        if (res.ok) {
          const data: ApolloSearchResponse = await res.json();
          if (data.person?.email || data.person?.phone_numbers?.length) {
            return data.person;
          }
        }
      }

      // Fallback: busca por nome + empresa
      const [firstName, ...rest] = input.name.trim().split(' ');
      const lastName = rest.join(' ');

      const res = await fetch('https://api.apollo.io/v1/people/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName || undefined,
          organization_name: input.company,
          title: input.title,
          reveal_personal_emails: true,
          reveal_phone_number: true,
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) return null;
      const data: ApolloSearchResponse = await res.json();
      return data.person || null;

    } catch (err) {
      console.warn('[ApolloPlugin] Erro na busca:', err);
      return null;
    }
  }

  async run(input: LeadInput): Promise<EnrichmentResult> {
    if (!this.apiKey) {
      return { emails: [], phones: [], source: 'apollo', rawData: { skipped: 'APOLLO_API_KEY não configurada' } };
    }

    const person = await this.searchPerson(input);

    if (!person) {
      return { emails: [], phones: [], source: 'apollo', rawData: {} };
    }

    const emails: EmailCandidate[] = [];
    const phones: PhoneCandidate[] = [];

    // Email direto do Apollo (alta confiança — dado verificado)
    if (person.email) {
      emails.push({
        email: person.email.toLowerCase().trim(),
        confidence: 0.85,
        verified: true,
        catchAll: false,
        patternMatch: false,
        sources: ['apollo'],
      });
    }

    // Telefones (Apollo retorna números diretos, frequentemente celulares)
    for (const pn of person.phone_numbers || []) {
      const raw = pn.sanitized_number || pn.raw_number;
      if (!raw) continue;

      const normalized = normalizePhone(raw);
      const isMobile = isMobileBR(normalized) || pn.type === 'mobile';

      phones.push({
        phone: normalized,
        // Confiança alta: Apollo retorna números verificados/comprados de bases comerciais
        confidence: isMobile ? 0.80 : 0.70,
        hasWhatsApp: isMobile, // celulares brasileiros → muito provável ter WhatsApp
        type: isMobile ? 'mobile' : 'landline',
        sources: ['apollo'],
      });
    }

    console.log(`[ApolloPlugin] ${input.name}: ${emails.length} emails, ${phones.length} telefones`);

    return {
      emails,
      phones,
      source: 'apollo',
      rawData: { linkedin_url: person.linkedin_url },
    };
  }
}
