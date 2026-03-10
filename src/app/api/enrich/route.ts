import { createClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';
import { EnrichmentOrchestrator } from '@/lib/enrichment/orchestrator';
import type { LeadInput } from '@/lib/enrichment/types';

export async function POST(request: NextRequest) {
  try {
    const { contact_ids } = await request.json();

    if (!contact_ids || !Array.isArray(contact_ids)) {
      return NextResponse.json({ error: 'contact_ids array is required' }, { status: 400 });
    }

    const supabase = createClient();
    const results = [];
    const orchestrator = new EnrichmentOrchestrator();

    for (const id of contact_ids) {
      const { data: lead, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !lead) continue;

      const input: LeadInput = {
        id: lead.id,
        name: lead.name,
        company: lead.company,
        title: lead.title,
        linkedinUrl: lead.linkedin_url || '',
        domain: lead.email ? lead.email.split('@')[1] : undefined,
      };

      await supabase
        .from('contacts')
        .update({ enrichment_status: 'running', updated_at: new Date().toISOString() })
        .eq('id', id);

      const result = await orchestrator.enrich(input);

      const bestEmail = result.emails[0]?.email || lead.email;
      const emailConfidence = result.emails[0]?.confidence || lead.email_confidence;
      const bestPhone = result.phones[0]?.phone || lead.phone;
      const bestWhatsApp = result.phones.find((p: any) => p.hasWhatsApp)?.phone || lead.whatsapp;
      const overallScore = result.enrichmentScore;

      await supabase
        .from('contacts')
        .update({
          email: bestEmail,
          email_confidence: emailConfidence,
          phone: bestPhone,
          whatsapp: bestWhatsApp,
          overall_confidence: Math.round(overallScore * 100),
          enrichment_status: 'completed',
          enriched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      results.push({ id, status: 'completed', score: overallScore });
    }

    return NextResponse.json({ success: true, processed: results.length, data: results });

  } catch (error: any) {
    console.error('Enrichment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
