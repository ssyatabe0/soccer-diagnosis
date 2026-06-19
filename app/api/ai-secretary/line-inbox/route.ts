import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('placeholder')) return null
  return createClient(url.replace(/\/+$/, ''), key)
}

function isAuthorized(request: NextRequest) {
  const token = process.env.AI_SECRETARY_READ_TOKEN
  if (!token) return false

  const header = request.headers.get('authorization') || ''
  return header === `Bearer ${token}`
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'needs_review'
  const limit = Math.min(Number(searchParams.get('limit') || 50), 100)

  const { data, error } = await supabase
    .from('ai_secretary_line_inbox')
    .select('*')
    .eq('status', status)
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    status,
    count: data?.length || 0,
    items: data || [],
  })
}
