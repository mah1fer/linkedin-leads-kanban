import { createClient } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json({ error: 'Body must be a non-empty array' }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('contacts')
    .insert(body)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
