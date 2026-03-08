export interface LeadInput {
  id: string;
  name: string;
  company: string;
  title?: string;
  linkedinUrl?: string;
  domain?: string;
  phoneCandidates?: PhoneCandidate[];
}

export interface EmailCandidate {
  email: string;
  confidence: number;
  verified: boolean;
  catchAll: boolean;
  patternMatch: boolean;
  sources: PluginSource[];
}

export interface PhoneCandidate {
  phone: string;
  confidence: number;
  hasWhatsApp: boolean;
  type: 'mobile' | 'landline' | 'company' | 'unknown';
  sources: PluginSource[];
}

export type PluginSource =
  | 'google_dork'
  | 'smtp_verified'
  | 'domain_pattern'
  | 'cnpj'
  | 'whatsapp_check'
  | 'profile_direct'
  | 'permutation';

export interface EnrichmentResult {
  emails: EmailCandidate[];
  phones: PhoneCandidate[];
  source: PluginSource;
  rawData: Record<string, unknown>;
}

export interface EnrichedLead extends LeadInput {
  emails: (EmailCandidate & { label: ConfidenceLabel })[];
  phones: PhoneCandidate[];
  enrichmentScore: number;
  enrichedAt: string;
}

export type ConfidenceLabel = 'ALTO' | 'MÉDIO' | 'BAIXO' | 'ESPECULATIVO';

export interface EnrichmentPlugin {
  name: PluginSource;
  run(input: LeadInput): Promise<EnrichmentResult>;
}
