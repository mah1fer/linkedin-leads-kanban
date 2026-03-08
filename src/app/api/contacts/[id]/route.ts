import { sql } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await request.json()
  const { id } = await params

  // Build dynamic update query
  const keys = Object.keys(body)
  if (keys.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    const data = await sql`
      UPDATE contacts 
      SET ${sql(body, ...keys)}
      WHERE id = ${id}
      RETURNING *
    `
    return NextResponse.json(data[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await sql`DELETE FROM contacts WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
