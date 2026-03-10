import type { LeadInput, EnrichedLead, EmailCandidate } from './types';
import { GoogleDorkPlugin } from './plugins/google-dork';
import { DomainIntelPlugin } from './plugins/domain-intel';
import { CnpjPlugin } from './plugins/cnpj-plugin';
import { SmtpVerifierPlugin } from './plugins/smtp-verifier';
import { WhatsAppCheckerPlugin } from './plugins/whatsapp-checker';
import { PhoneOsintPlugin } from './plugins/phone-osint';
import { WebScraperPlugin } from './plugins/web-scraper';
import { deduplicateEmails, deduplicatePhones } from './utils/deduplicator';
import { calculateEmailConfidence, getConfidenceLabel } from './scoring-engine';

export class EnrichmentOrchestrator {
  async enrich(input: LeadInput): Promise<EnrichedLead> {
    console.log(`[Enrichment] Iniciando para: ${input.name} @ ${input.company}`);

    // FASE 1: Plugins paralelos de descoberta
    // — emails: GoogleDork, DomainIntel, CNPJ, WebScraper
    // — phones: GoogleDork, CNPJ, PhoneOsint, WebScraper
    const [dorkResult, domainResult, cnpjResult, phoneOsintResult, webScraperResult] =
      await Promise.allSettled([
        new GoogleDorkPlugin().run(input),
        new DomainIntelPlugin().run(input),
        new CnpjPlugin().run(input),
        new PhoneOsintPlugin().run(input),
        new WebScraperPlugin().run(input),
      ]);

    // Consolida todos os emails e phones encontrados
    const allEmails: EmailCandidate[] = [];
    const allPhones: any[] = [];

    for (const result of [dorkResult, domainResult, cnpjResult, phoneOsintResult, webScraperResult]) {
      if (result.status === 'fulfilled') {
        allEmails.push(...result.value.emails);
        allPhones.push(...result.value.phones);
      }
    }

    // Deduplicação com cross-reference (aumenta confidence se mesma info em 2+ fontes)
    const dedupedEmails = deduplicateEmails(allEmails);
    const dedupedPhones = deduplicatePhones(allPhones);

    // FASE 2: Verificação SMTP (apenas emails com confidence >= 0.30)
    const smtpVerifier = new SmtpVerifierPlugin();
    const verifiedEmails = await smtpVerifier.runBatch(dedupedEmails);

    // FASE 3: Verifica quais celulares têm WhatsApp
    const waResult = await new WhatsAppCheckerPlugin().run({
      ...input,
      phoneCandidates: dedupedPhones,
    });

    // Score final de cada email
    const scoredEmails = verifiedEmails
      .map(e => ({
        ...e,
        confidence: calculateEmailConfidence(e),
        label: getConfidenceLabel(calculateEmailConfidence(e)),
      }))
      .sort((a, b) => b.confidence - a.confidence);

    // Ordena phones: móveis com WhatsApp primeiro, depois por confidence
    const sortedPhones = waResult.phones.sort((a: any, b: any) => {
      if (a.hasWhatsApp !== b.hasWhatsApp) return a.hasWhatsApp ? -1 : 1;
      return b.confidence - a.confidence;
    });

    const enrichmentScore = scoredEmails.length > 0
      ? Math.max(...scoredEmails.map(e => e.confidence))
      : (sortedPhones.length > 0 ? Math.max(...sortedPhones.map((p: any) => p.confidence)) : 0);

    console.log(
      `[Enrichment] Concluído: ${scoredEmails.length} emails, ${sortedPhones.length} phones` +
      ` (${sortedPhones.filter((p: any) => p.hasWhatsApp).length} com WA), score: ${enrichmentScore.toFixed(2)}`
    );

    return {
      ...input,
      emails: scoredEmails,
      phones: sortedPhones,
      enrichmentScore,
      enrichedAt: new Date().toISOString(),
    };
  }
}
