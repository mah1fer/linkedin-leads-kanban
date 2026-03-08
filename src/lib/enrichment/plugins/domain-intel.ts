import type { EnrichmentPlugin, LeadInput, EnrichmentResult, EmailCandidate } from '../types';

type Pattern = 'nome.sobrenome' | 'n.sobrenome' | 'nome' | 'nomesobrenome' | 'nome_sobrenome' | 'nsobrenome';

function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getNameParts(fullName: string): { first: string; last: string } {
  const parts = removeDiacritics(fullName.toLowerCase()).split(' ').filter(Boolean);
  return { first: parts[0] || '', last: parts[parts.length - 1] || '' };
}

function applyPattern(pattern: Pattern, first: string, last: string): string {
  const map: Record<Pattern, string> = {
    'nome.sobrenome':  `${first}.${last}`,
    'n.sobrenome':     `${first[0]}.${last}`,
    'nome':            first,
    'nomesobrenome':   `${first}${last}`,
    'nome_sobrenome':  `${first}_${last}`,
    'nsobrenome':      `${first[0]}${last}`,
  };
  return map[pattern];
}

export class DomainIntelPlugin implements EnrichmentPlugin {
  name = 'domain_pattern' as const;

  readonly PATTERNS: Pattern[] = [
    'nome.sobrenome', 'n.sobrenome', 'nome',
    'nomesobrenome', 'nome_sobrenome', 'nsobrenome',
  ];

  generatePermutations(name: string, domain: string): EmailCandidate[] {
    const { first, last } = getNameParts(name);
    if (!first || !last || !domain) return [];

    return this.PATTERNS.map(pattern => ({
      email: `${applyPattern(pattern, first, last)}@${domain}`,
      confidence: 0.25,
      verified: false,
      catchAll: false,
      patternMatch: false,
      sources: ['permutation'] as any,
    }));
  }

  private async detectPattern(domain: string): Promise<Pattern | null> {
    const apiKey = process.env.HUNTER_API_KEY;
    if (!apiKey) return null;

    try {
      const res = await fetch(
        `https://api.hunter.io/v2/domain-search?domain=${domain}&limit=5&api_key=${apiKey}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return (data.data?.pattern as Pattern) || null;
    } catch {
      return null;
    }
  }

  async run(input: LeadInput): Promise<EnrichmentResult> {
    const domain = input.domain || `${input.company.toLowerCase().replace(/\s+/g, '')}.com.br`;

    try {
      const detectedPattern = await this.detectPattern(domain);
      const { first, last } = getNameParts(input.name);

      let emails: EmailCandidate[];

      if (detectedPattern) {
        // Se detectou padrão, prioriza ele com confidence maior
        const primaryEmail = `${applyPattern(detectedPattern, first, last)}@${domain}`;
        emails = [{
          email: primaryEmail,
          confidence: 0.65,
          verified: false,
          catchAll: false,
          patternMatch: true,
          sources: ['domain_pattern'],
        }];
        // Adiciona as outras permutações com confidence menor
        const others = this.generatePermutations(input.name, domain)
          .filter(e => e.email !== primaryEmail);
        emails = [...emails, ...others];
      } else {
        // Sem padrão detectado, gera todas as permutações
        emails = this.generatePermutations(input.name, domain);
      }

      return { emails, phones: [], source: 'domain_pattern', rawData: { domain, detectedPattern } };
    } catch (err) {
      console.error('[DomainIntelPlugin]', err);
      return { emails: [], phones: [], source: 'domain_pattern', rawData: {} };
    }
  }
}
