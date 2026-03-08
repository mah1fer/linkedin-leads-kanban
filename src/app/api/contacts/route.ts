import { sql } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const stage = searchParams.get('stage')
  const search = searchParams.get('search')
  const minConfidence = searchParams.get('min_confidence')
  const tags = searchParams.get('tags')
  const enrichmentStatus = searchParams.get('enrichment_status')

  let query = 'SELECT * FROM contacts WHERE 1=1'
  const params: any[] = []

  if (stage) {
    params.push(stage)
    query += ` AND stage = $${params.length}`
  }
  if (enrichmentStatus) {
    params.push(enrichmentStatus)
    query += ` AND enrichment_status = $${params.length}`
  }
  if (minConfidence) {
    params.push(parseInt(minConfidence))
    query += ` AND overall_confidence >= $${params.length}`
  }
  if (tags) {
    params.push(tags.split(','))
    query += ` AND tags @> $${params.length}`
  }
  
  if (search) {
    params.push(`%${search}%`)
    const p = `$${params.length}`
    query += ` AND (name ILIKE ${p} OR company ILIKE ${p} OR title ILIKE ${p})`
  }

  query += ' ORDER BY created_at DESC'

  try {
    const data = await sql.unsafe(query, params)
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, title, company, company_url, linkedin_url, tags, stage } = body

  try {
    const data = await sql`
      INSERT INTO contacts (name, title, company, company_url, linkedin_url, tags, stage)
      VALUES (${name}, ${title}, ${company}, ${company_url}, ${linkedin_url}, ${tags || []}, ${stage || 'novo'})
      RETURNING *
    `
    return NextResponse.json(data[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
