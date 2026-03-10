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

    const domain = contact.email ? contact.email.split('@')[1] : undefined;

    const orchestrator = new EnrichmentOrchestrator();
    const enriched = await orchestrator.enrich({
      id,
      name: contact.name,
      company: contact.company || '',
      title: contact.title,
      linkedinUrl: contact.linkedin_url,
      domain,
    });

    const primaryEmail = enriched.emails[0];
    const primaryPhone = enriched.phones.find((p: any) => p.hasWhatsApp) || enriched.phones[0];

    await supabase
      .from('contacts')
      .update({
        email: primaryEmail?.email || contact.email,
        phone: primaryPhone?.phone || contact.phone,
        email_confidence: primaryEmail?.confidence || 0,
        phone_confidence: primaryPhone?.confidence || 0,
        enrichment_status: 'completed',
        enrichment_score: enriched.enrichmentScore,
        enriched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (enriched.emails.length > 0) {
      await supabase.from('email_candidates').delete().eq('contact_id', id);
      const emailRows = enriched.emails.map((e: any, i: number) => ({
        contact_id: id,
        email: e.email,
        confidence: e.confidence,
        verified: e.verified,
        catch_all: e.catchAll,
        sources: e.sources,
        is_primary: i === 0,
      }));
      await supabase.from('email_candidates').insert(emailRows);
    }

    if (enriched.phones.length > 0) {
      await supabase.from('phone_candidates').delete().eq('contact_id', id);
      const phoneRows = enriched.phones.map((p: any, i: number) => ({
        contact_id: id,
        phone: p.phone,
        confidence: p.confidence,
        has_whatsapp: p.hasWhatsApp,
        type: p.type,
        sources: p.sources,
        is_primary: i === 0,
      }));
      await supabase.from('phone_candidates').insert(phoneRows);
    }

    return NextResponse.json({
      success: true,
      data: {
        emails: enriched.emails,
        phones: enriched.phones,
        enrichmentScore: enriched.enrichmentScore,
        primaryEmail: primaryEmail?.email,
        primaryPhone: primaryPhone?.phone,
        hasWhatsApp: primaryPhone?.hasWhatsApp || false,
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
