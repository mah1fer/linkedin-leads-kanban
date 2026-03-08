import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { EnrichmentOrchestrator } from '@/lib/enrichment/orchestrator';
import type { LeadInput } from '@/lib/enrichment/types';

export async function POST(request: NextRequest) {
  try {
    const { contact_ids } = await request.json();

    if (!contact_ids || !Array.isArray(contact_ids)) {
      return NextResponse.json({ error: 'contact_ids array is required' }, { status: 400 });
    }

    const results = [];
    const orchestrator = new EnrichmentOrchestrator();

    for (const id of contact_ids) {
      // 1. Fetch Lead
      const leads = await sql`SELECT * FROM contacts WHERE id = ${id}`;
      if (leads.length === 0) continue;

      const lead = leads[0];

      // 2. Prepare Input
      const input: LeadInput = {
        id: lead.id,
        name: lead.name,
        company: lead.company,
        title: lead.title,
        linkedinUrl: lead.linkedin_url || '',
        domain: lead.email ? lead.email.split('@')[1] : undefined,
      };

      // 3. Update Status to Running
      await sql`UPDATE contacts SET enrichment_status = 'running', updated_at = NOW() WHERE id = ${id}`;

      // 4. Run Orchestrator
      const result = await orchestrator.enrich(input);

      // 5. Update Lead with Results
      const bestEmail = result.emails[0]?.email || lead.email;
      const emailConfidence = result.emails[0]?.confidence || lead.email_confidence;
      const bestPhone = result.phones[0]?.phone || lead.phone;
      const bestWhatsApp = result.phones.find(p => p.hasWhatsApp)?.phone || lead.whatsapp;
      const overallScore = result.enrichmentScore;

      await sql`
        UPDATE contacts
        SET
          email = ${bestEmail},
          email_confidence = ${emailConfidence},
          phone = ${bestPhone},
          whatsapp = ${bestWhatsApp},
          overall_confidence = ${Math.round(overallScore * 100)},
          enrichment_status = 'completed',
          enriched_at = NOW(),
          updated_at = NOW(),
          raw_sources = ${sql.json(result as any)}
        WHERE id = ${id}
      `;

      results.push({ id, status: 'completed', score: overallScore });
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      data: results
    });

  } catch (error: any) {
    console.error('Enrichment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
