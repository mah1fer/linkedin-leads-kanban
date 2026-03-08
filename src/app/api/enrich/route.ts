import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { googleDorkSearch } from '@/lib/enrichment/google-dork'
import { generateEmailPermutations } from '@/lib/enrichment/email-permutation'
import { verifyEmails } from '@/lib/enrichment/smtp-verify'
import { findWhatsApp } from '@/lib/enrichment/whatsapp-finder'
import { crossReferenceWithLLM } from '@/lib/enrichment/llm-validator'

async function enrichContact(contactId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  // 1. Fetch contact
  const { data: contact, error: fetchError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single()

  if (fetchError || !contact) throw new Error('Contact not found')

  // 2. Mark as running
  await supabase
    .from('contacts')
    .update({ enrichment_status: 'running' })
    .eq('id', contactId)

  const logs: Array<{ contact_id: string; source: string; found_data: object; confidence: number }> = []

  try {
    const name = contact.name || ''
    const company = contact.company || ''
    const companyUrl = contact.company_url || ''

    // 3. Extract domain from company URL
    let domain = ''
    if (companyUrl) {
      try { domain = new URL(companyUrl).hostname.replace('www.', '') } catch {}
    }

    // 4. Google Dork Search
    const dorkResult = await googleDorkSearch(name, company, { forEmail: true, forWhatsApp: true })
    logs.push({ contact_id: contactId, source: 'google', found_data: dorkResult, confidence: 55 })

    // 5. Email permutations + SMTP verify (if we have a domain)
    let bestEmail = contact.email || null
    let emailConfidence = contact.email_confidence || 0

    if (domain) {
      const nameParts = name.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(-1)[0] || nameParts[0] || ''

      const permutations = generateEmailPermutations(firstName, lastName, domain)
      const emailsToVerify = [...new Set([...permutations, ...dorkResult.emails.map(e => e.value)])]
      const verifyResults = await verifyEmails(emailsToVerify)
      
      // Pick the best verified email or fallback to dork emails
      const verified = verifyResults.find(r => r.valid && !r.catch_all)
      if (verified) {
        bestEmail = verified.email
        emailConfidence = 95
      } else if (dorkResult.emails.length > 0) {
        bestEmail = dorkResult.emails[0].value
        emailConfidence = 50
      }

      logs.push({
        contact_id: contactId,
        source: 'smtp',
        found_data: { verifyResults: verifyResults.slice(0, 5), bestEmail },
        confidence: emailConfidence,
      })
    } else if (dorkResult.emails.length > 0) {
      bestEmail = dorkResult.emails[0].value
      emailConfidence = 50
      logs.push({ contact_id: contactId, source: 'google_email', found_data: { emails: dorkResult.emails }, confidence: 50 })
    }

    // 6. WhatsApp finder
    const whatsAppResults = await findWhatsApp(name, company, contact.phone, dorkResult)
    const bestWhatsApp = whatsAppResults[0] || null
    logs.push({
      contact_id: contactId,
      source: 'whatsapp',
      found_data: { results: whatsAppResults },
      confidence: bestWhatsApp?.confidence || 0,
    })

    // 7. LLM Cross-reference (only if overall confidence < 70)
    let llmResult = null
    const overallConfidence = Math.round((emailConfidence + (bestWhatsApp?.confidence || 0)) / 2)

    if (overallConfidence < 70 && (dorkResult.emails.length > 0 || dorkResult.phones.length > 0)) {
      llmResult = await crossReferenceWithLLM(
        { name, company, domain },
        { name, company, emails: dorkResult.emails, phones: dorkResult.phones, social_profiles: dorkResult.social_profiles }
      )

      // Use LLM's suggestions if it found a better match
      if (llmResult.best_email && llmResult.email_confidence > emailConfidence) {
        bestEmail = llmResult.best_email
        emailConfidence = llmResult.email_confidence
      }

      logs.push({
        contact_id: contactId,
        source: 'llm',
        found_data: llmResult,
        confidence: llmResult.email_confidence,
      })
    }

    const finalConfidence = Math.round((emailConfidence + (bestWhatsApp?.confidence || 0)) / 2)

    // 8. Update contact with results
    await supabase.from('contacts').update({
      email: bestEmail,
      email_confidence: emailConfidence,
      whatsapp: bestWhatsApp?.whatsapp || contact.whatsapp,
      whatsapp_source: bestWhatsApp?.source || contact.whatsapp_source,
      overall_confidence: finalConfidence,
      enrichment_status: 'done',
      raw_sources: {
        google: dorkResult,
        whatsapp: whatsAppResults,
        llm: llmResult,
      },
    }).eq('id', contactId)

    // 9. Save enrichment logs
    if (logs.length > 0) {
      await supabase.from('enrichment_logs').insert(logs)
    }

    return { success: true, contactId, email: bestEmail, whatsapp: bestWhatsApp?.whatsapp, confidence: finalConfidence }
  } catch (error: any) {
    await supabase.from('contacts').update({ enrichment_status: 'failed' }).eq('id', contactId)
    throw error
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()

  const { contact_id, contact_ids } = body

  if (!contact_id && (!contact_ids || !contact_ids.length)) {
    return NextResponse.json({ error: 'contact_id or contact_ids required' }, { status: 400 })
  }

  const ids: string[] = contact_ids || [contact_id]

  try {
    const results = await Promise.allSettled(ids.map(id => enrichContact(id, supabase)))
    return NextResponse.json({
      results: results.map((r, i) => ({
        contactId: ids[i],
        status: r.status,
        ...(r.status === 'fulfilled' ? r.value : { error: r.reason?.message }),
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
