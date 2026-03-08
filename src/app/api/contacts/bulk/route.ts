import { sql } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json() // Expects an array of contacts

  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json({ error: 'Body must be a non-empty array' }, { status: 400 })
  }

  try {
    const data = await sql`
      INSERT INTO contacts ${sql(body)}
      RETURNING *
    `
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
