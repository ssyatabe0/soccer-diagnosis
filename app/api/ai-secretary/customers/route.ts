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
  const queryToken = new URL(request.url).searchParams.get('token') || ''
  return header === `Bearer ${token}` || queryToken === token
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
  const status = searchParams.get('status') || ''
  const serviceType = searchParams.get('service_type') || ''
  const limit = Math.min(Number(searchParams.get('limit') || 100), 200)

  let query = supabase
    .from('ai_secretary_customers')
    .select('*')
    .order('last_contact_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (status) query = query.eq('status', status)
  if (serviceType) query = query.eq('service_type', serviceType)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ count: data?.length || 0, items: data || [] })
}
