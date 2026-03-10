import { createClient } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const stage = searchParams.get('stage')
  const search = searchParams.get('search')
  const minConfidence = searchParams.get('min_confidence')
  const tags = searchParams.get('tags')
  const enrichmentStatus = searchParams.get('enrichment_status')

  const supabase = createClient()
  let query = supabase.from('contacts').select('*').order('created_at', { ascending: false })

  if (stage) query = query.eq('stage', stage)
  if (enrichmentStatus) query = query.eq('enrichment_status', enrichmentStatus)
  if (minConfidence) query = query.gte('overall_confidence', parseInt(minConfidence))
  if (tags) query = query.contains('tags', tags.split(','))
  if (search) query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,title.ilike.%${search}%`)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, title, company, company_url, linkedin_url, tags, stage } = body

  const supabase = createClient()
  const { data, error } = await supabase
    .from('contacts')
    .insert([{ name, title, company, company_url, linkedin_url, tags: tags || [], stage: stage || 'novo' }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
