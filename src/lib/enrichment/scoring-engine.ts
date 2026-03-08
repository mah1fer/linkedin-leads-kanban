import type { EmailCandidate, ConfidenceLabel } from './types';

// Score base por fonte (sem LLM)
const BASE_SCORES: Record<string, number> = {
  profile_direct: 0.90,  // encontrado direto no perfil LinkedIn
  smtp_verified:  0.80,  // SMTP RCPT TO confirmado
  cnpj:           0.70,  // email público do CNPJ
  whatsapp_check: 0.85,  // número tem WA ativo
  domain_pattern: 0.65,  // bate com padrão da empresa
  google_dork:    0.40,  // encontrado via busca pública
  permutation:    0.25,  // apenas gerado, não verificado
};

export function calculateEmailConfidence(candidate: EmailCandidate): number {
  // Score pela fonte mais confiável
  const bestSource = candidate.sources
    .map(s => BASE_SCORES[s] || 0)
    .sort((a, b) => b - a)[0] || 0;

  let score = bestSource;

  // Bônus cross-reference: mesmo email em 2+ fontes
  if (candidate.sources.length > 1) score += 0.15;

  // Bônus padrão da empresa confirmado
  if (candidate.patternMatch) score += 0.10;

  // Penalidade catch-all: domínio aceita qualquer email
  if (candidate.catchAll) score -= 0.30;

  return Math.min(Math.max(score, 0), 1.0);
}

export function getConfidenceLabel(score: number): ConfidenceLabel {
  if (score >= 0.80) return 'ALTO';
  if (score >= 0.60) return 'MÉDIO';
  if (score >= 0.40) return 'BAIXO';
  return 'ESPECULATIVO';
}

export function getConfidenceColor(label: ConfidenceLabel): string {
  const colors: Record<ConfidenceLabel, string> = {
    'ALTO':         'bg-green-100 text-green-800 border-green-200',
    'MÉDIO':        'bg-yellow-100 text-yellow-800 border-yellow-200',
    'BAIXO':        'bg-orange-100 text-orange-800 border-orange-200',
    'ESPECULATIVO': 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return colors[label];
}
