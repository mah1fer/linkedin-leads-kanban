import { sql } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const format = searchParams.get('format') || 'csv'
  const stage = searchParams.get('stage')
  const minConfidence = searchParams.get('min_confidence')
  const ids = searchParams.get('ids') // comma-separated

  let query = 'SELECT * FROM contacts WHERE 1=1'
  const params: any[] = []

  if (stage) {
    params.push(stage)
    query += ` AND stage = $${params.length}`
  }
  if (minConfidence) {
    params.push(parseInt(minConfidence))
    query += ` AND overall_confidence >= $${params.length}`
  }
  if (ids) {
    params.push(ids.split(','))
    query += ` AND id = ANY($${params.length})`
  }

  query += ' ORDER BY overall_confidence DESC'

  try {
    const contacts = await sql.unsafe(query, params)

    if (format === 'json') {
      return NextResponse.json(contacts, {
        headers: {
          'Content-Disposition': 'attachment; filename="leads.json"',
          'Content-Type': 'application/json',
        },
      })
    }

    // CSV
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
