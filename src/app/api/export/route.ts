import { createClient } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const format = searchParams.get('format') || 'csv'
  const stage = searchParams.get('stage')
  const minConfidence = searchParams.get('min_confidence')
  const ids = searchParams.get('ids')

  const supabase = createClient()
  let query = supabase.from('contacts').select('*').order('overall_confidence', { ascending: false })

  if (stage) query = query.eq('stage', stage)
  if (minConfidence) query = query.gte('overall_confidence', parseInt(minConfidence))
  if (ids) query = query.in('id', ids.split(','))

  const { data: contacts, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (format === 'json') {
    return NextResponse.json(contacts, {
      headers: {
        'Content-Disposition': 'attachment; filename="leads.json"',
        'Content-Type': 'application/json',
      },
    })
  }

  const headers = [
    'Nome', 'Cargo', 'Empresa', 'Email', 'Confiança Email',
    'WhatsApp', 'Fonte WhatsApp', 'LinkedIn URL', 'Tags', 'Status', 'Score Geral'
  ]

  const rows = (contacts || []).map(c => [
    c.name || '',
    c.title || '',
    c.company || '',
    c.email || '',
    c.email_confidence || 0,
    c.whatsapp || '',
    c.whatsapp_source || '',
    c.linkedin_url || '',
    (c.tags || []).join(';'),
    c.stage || '',
    c.overall_confidence || 0,
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Disposition': 'attachment; filename="leads.csv"',
      'Content-Type': 'text/csv; charset=utf-8',
    },
  })
}
