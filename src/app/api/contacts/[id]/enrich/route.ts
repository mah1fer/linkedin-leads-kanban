import { NextRequest, NextResponse } from 'next/server';
import { sql as db } from '@/lib/db'; 
import { EnrichmentOrchestrator } from '@/lib/enrichment/orchestrator';

export const maxDuration = 60; // segundos — requer Vercel Pro para > 10s

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;

  try {
    // Busca o contato
    const result = await db`
      SELECT * FROM contacts WHERE id = ${id} LIMIT 1
    `;

    const contact = result[0];
    if (!contact) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 });
    }

    // Marca como "enriquecendo"
    await db`
      UPDATE contacts
      SET enrichment_status = 'enriching', updated_at = NOW()
      WHERE id = ${id}
    `;

    // Extrai domínio do email existente ou da URL do LinkedIn
    const domain = contact.email
      ? contact.email.split('@')[1]
      : undefined;

    // Executa o enriquecimento
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
    const primaryPhone = enriched.phones.find(p => p.hasWhatsApp) || enriched.phones[0];

    // Salva resultado principal no contato
    await db`
      UPDATE contacts SET
        email               = ${primaryEmail?.email || contact.email},
        phone               = ${primaryPhone?.phone || contact.phone},
        email_confidence    = ${primaryEmail?.confidence || 0},
        phone_confidence    = ${primaryPhone?.confidence || 0},
        enrichment_status   = 'completed',
        enrichment_score    = ${enriched.enrichmentScore},
        enriched_at         = NOW(),
        updated_at          = NOW()
      WHERE id = ${id}
    `;

    // Salva todos os email candidates
    if (enriched.emails.length > 0) {
      await db`DELETE FROM email_candidates WHERE contact_id = ${id}`;
      for (const [i, e] of enriched.emails.entries()) {
        await db`
          INSERT INTO email_candidates
            (contact_id, email, confidence, verified, catch_all, sources, is_primary)
          VALUES
            (${id}, ${e.email}, ${e.confidence}, ${e.verified}, ${e.catchAll},
             ${e.sources}, ${i === 0})
        `;
      }
    }

    // Salva phone candidates
    if (enriched.phones.length > 0) {
      await db`DELETE FROM phone_candidates WHERE contact_id = ${id}`;
      for (const [i, p] of enriched.phones.entries()) {
        await db`
          INSERT INTO phone_candidates
            (contact_id, phone, confidence, has_whatsapp, type, sources, is_primary)
          VALUES
            (${id}, ${p.phone}, ${p.confidence}, ${p.hasWhatsApp},
             ${p.type}, ${p.sources}, ${i === 0})
        `;
      }
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

    await db`
      UPDATE contacts
      SET enrichment_status = 'failed', updated_at = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json(
      { error: 'Erro ao enriquecer contato' },
      { status: 500 }
    );
  }
}
