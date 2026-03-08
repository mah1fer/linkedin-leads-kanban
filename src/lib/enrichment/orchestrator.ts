import type { LeadInput, EnrichedLead, EmailCandidate } from './types';
import { GoogleDorkPlugin } from './plugins/google-dork';
import { DomainIntelPlugin } from './plugins/domain-intel';
import { CnpjPlugin } from './plugins/cnpj-plugin';
import { SmtpVerifierPlugin } from './plugins/smtp-verifier';
import { WhatsAppCheckerPlugin } from './plugins/whatsapp-checker';
import { deduplicateEmails, deduplicatePhones } from './utils/deduplicator';
import { calculateEmailConfidence, getConfidenceLabel } from './scoring-engine';

export class EnrichmentOrchestrator {
  async enrich(input: LeadInput): Promise<EnrichedLead> {
    console.log(`[Enrichment] Iniciando para: ${input.name} @ ${input.company}`);

    // FASE 1: Plugins paralelos de descoberta
    const [dorkResult, domainResult, cnpjResult] = await Promise.allSettled([
      new GoogleDorkPlugin().run(input),
      new DomainIntelPlugin().run(input),
      new CnpjPlugin().run(input),
    ]);

    // Consolida todos os emails e phones encontrados
    const allEmails: EmailCandidate[] = [];
    const allPhones: any[] = [];

    for (const result of [dorkResult, domainResult, cnpjResult]) {
      if (result.status === 'fulfilled') {
        allEmails.push(...result.value.emails);
        allPhones.push(...result.value.phones);
      }
    }

    // Deduplicação com cross-reference
    const dedupedEmails = deduplicateEmails(allEmails);
    const dedupedPhones = deduplicatePhones(allPhones);

    // FASE 2: Verificação SMTP (apenas os emails com confidence >= 0.30)
    const smtpVerifier = new SmtpVerifierPlugin();
    const verifiedEmails = await smtpVerifier.runBatch(dedupedEmails);

    // FASE 3: Verificação WhatsApp nos celulares encontrados
    const waResult = await new WhatsAppCheckerPlugin().run({
      ...input,
      phoneCandidates: dedupedPhones,
    });

    // Calcula score final de cada email
    const scoredEmails = verifiedEmails
      .map(e => ({
        ...e,
        confidence: calculateEmailConfidence(e),
        label: getConfidenceLabel(calculateEmailConfidence(e)),
      }))
      .sort((a, b) => b.confidence - a.confidence);

    const enrichmentScore = scoredEmails.length > 0
      ? Math.max(...scoredEmails.map(e => e.confidence))
      : 0;

    console.log(`[Enrichment] Concluído: ${scoredEmails.length} emails, ${waResult.phones.length} phones, score: ${enrichmentScore.toFixed(2)}`);

    return {
      ...input,
      emails: scoredEmails,
      phones: waResult.phones,
      enrichmentScore,
      enrichedAt: new Date().toISOString(),
    };
  }
}
