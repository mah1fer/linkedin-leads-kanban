import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { EnrichmentOrchestrator } from '@/lib/enrichment/orchestrator';

export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createClient();

  try {
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !contact) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 });
    }

    await supabase
      .from('contacts')
      .update({ enrichment_status: 'enriching', updated_at: new Date().toISOString() })
      .eq('id', id);

    // Extrai domínio do email existente (se houver)
    const domain = contact.email ? contact.email.split('@')[1] : undefined;

    // Extrai URLs pessoais do campo raw_sources (links salvos no perfil)
    let personalSiteUrls: string[] = [];
    try {
      const raw = contact.raw_sources || {};
      const links: any[] = raw.links || [];
      personalSiteUrls = links
        .map((l: any) => l.url || l)
        .filter((url: string) =>
          typeof url === 'string' &&
          url.startsWith('http') &&
          !url.includes('linkedin.com')
        );
    } catch { /* ignora erro de parsing */ }

    const orchestrator = new EnrichmentOrchestrator();
    const enriched = await orchestrator.enrich({
      id,
      name: contact.name,
      company: contact.company || '',
      title: contact.title,
      linkedinUrl: contact.linkedin_url,
      domain,
      personalSiteUrls,
    });

    // ── Seleciona os melhores candidatos ────────────────────────────────────
    const primaryEmail = enriched.emails[0];

    // Ordem de preferência: celular com WA > qualquer celular > qualquer número
    const primaryPhone =
      enriched.phones.find((p: any) => p.hasWhatsApp && p.type === 'mobile') ||
      enriched.phones.find((p: any) => p.type === 'mobile') ||
      enriched.phones[0];

    // Melhor candidato WhatsApp (celular confirmado com WA)
    const whatsappPhone = enriched.phones.find((p: any) => p.hasWhatsApp);

    // ── Serializa todos os candidatos para salvar no raw_sources ─────────────
    const currentRaw = contact.raw_sources || {};
    const updatedRaw = {
      ...currentRaw,
      // Todos os telefones enriquecidos com metadados (para o drawer exibir)
      enrichedPhones: enriched.phones.map((p: any) => ({
        phone: p.phone,
        confidence: Math.round(p.confidence * 100),
        hasWhatsApp: p.hasWhatsApp,
        type: p.type,
        sources: p.sources,
      })),
      // Todos os emails enriquecidos com metadados
      enrichedEmails: enriched.emails.map((e: any) => ({
        email: e.email,
        confidence: Math.round(e.confidence * 100),
        verified: e.verified,
        sources: e.sources,
      })),
    };

    // ── Salva no Supabase ────────────────────────────────────────────────────
    await supabase
      .from('contacts')
      .update({
        // Só atualiza email/phone se o enriquecimento encontrou algo
        ...(primaryEmail && { email: primaryEmail.email }),
        ...(primaryPhone && { phone: primaryPhone.phone }),
        // NUNCA sobrescreve whatsapp manual com fallback de outro número
        // Só atualiza se encontrou explicitamente um número com WhatsApp
        ...(whatsappPhone && { whatsapp: whatsappPhone.phone }),
        ...(whatsappPhone && { whatsapp_source: whatsappPhone.sources.join(',') }),
        email_confidence: primaryEmail ? Math.round(primaryEmail.confidence * 100) : (contact.email_confidence || 0),
        phone_confidence: primaryPhone ? Math.round(primaryPhone.confidence * 100) : (contact.phone_confidence || 0),
        enrichment_status: 'completed',
        enrichment_score: Math.round(enriched.enrichmentScore * 100),
        overall_confidence: Math.round(enriched.enrichmentScore * 100),
        enriched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        raw_sources: updatedRaw,
      })
      .eq('id', id);

    // ── Salva candidatos nas tabelas auxiliares ──────────────────────────────
    if (enriched.emails.length > 0) {
      await supabase.from('email_candidates').delete().eq('contact_id', id);
      await supabase.from('email_candidates').insert(
        enriched.emails.map((e: any, i: number) => ({
          contact_id: id,
          email: e.email,
          confidence: Math.round(e.confidence * 100),
          verified: e.verified,
          catch_all: e.catchAll,
          sources: e.sources,
          is_primary: i === 0,
        }))
      );
    }

    if (enriched.phones.length > 0) {
      await supabase.from('phone_candidates').delete().eq('contact_id', id);
      await supabase.from('phone_candidates').insert(
        enriched.phones.map((p: any, i: number) => ({
          contact_id: id,
          phone: p.phone,
          confidence: Math.round(p.confidence * 100),
          has_whatsapp: p.hasWhatsApp,
          type: p.type,
          sources: p.sources,
          is_primary: i === 0,
        }))
      );
    }

    console.log(
      `[Enrich] ${contact.name}: ` +
      `${enriched.emails.length} emails, ` +
      `${enriched.phones.length} phones ` +
      `(${enriched.phones.filter((p: any) => p.hasWhatsApp).length} com WA)`
    );

    return NextResponse.json({
      success: true,
      data: {
        emails: updatedRaw.enrichedEmails,
        phones: updatedRaw.enrichedPhones,
        enrichmentScore: enriched.enrichmentScore,
        primaryEmail: primaryEmail?.email,
        primaryPhone: primaryPhone?.phone,
        whatsapp: whatsappPhone?.phone || null,
        hasWhatsApp: !!whatsappPhone,
      },
    });

  } catch (error) {
    console.error('[Enrich API]', error);
    await supabase
      .from('contacts')
      .update({ enrichment_status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ error: 'Erro ao enriquecer contato' }, { status: 500 });
  }
}
