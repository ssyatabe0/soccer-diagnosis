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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })
  }

  const { id } = await params

  const [
    { data: customer, error: customerError },
    { data: timeline, error: timelineError },
    { data: lines, error: linesError },
    { data: contracts, error: contractsError },
    { data: ticketUsage, error: ticketUsageError },
    { data: followTasks, error: followTasksError },
    { data: salesCandidates, error: salesCandidatesError },
  ] = await Promise.all([
    supabase.from('customers').select('*').eq('id', id).single(),
    supabase.from('customer_timeline_events').select('*').eq('customer_id', id).order('occurred_at', { ascending: false }).limit(100),
    supabase.from('ai_secretary_line_inbox').select('*').eq('customer_id', id).order('occurred_at', { ascending: false }).limit(100),
    supabase.from('ai_secretary_contracts').select('*').eq('customer_id', id).order('purchase_date', { ascending: false, nullsFirst: false }).limit(100),
    supabase.from('ticket_usage').select('*').eq('customer_id', id).order('usage_date', { ascending: false }).limit(100),
    supabase.from('follow_tasks').select('*').eq('customer_id', id).order('due_date', { ascending: true, nullsFirst: false }).limit(100),
    supabase.from('ai_secretary_sales_candidates').select('*').eq('customer_id', id).limit(100),
  ])

  if (customerError) return NextResponse.json({ error: customerError.message }, { status: 500 })
  if (timelineError) return NextResponse.json({ error: timelineError.message }, { status: 500 })
  if (linesError) return NextResponse.json({ error: linesError.message }, { status: 500 })
  if (contractsError) return NextResponse.json({ error: contractsError.message }, { status: 500 })
  if (ticketUsageError) return NextResponse.json({ error: ticketUsageError.message }, { status: 500 })
  if (followTasksError) return NextResponse.json({ error: followTasksError.message }, { status: 500 })
  if (salesCandidatesError) return NextResponse.json({ error: salesCandidatesError.message }, { status: 500 })

  return NextResponse.json({
    customer,
    timeline: timeline || [],
    line_messages: lines || [],
    contracts: contracts || [],
    ticket_usage: ticketUsage || [],
    follow_tasks: followTasks || [],
    sales_candidates: salesCandidates || [],
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  const allowed = ['full_name', 'parent_name', 'child_name', 'email', 'phone', 'address', 'service_type', 'status', 'grade', 'region', 'team_name', 'inquiry_date', 'trial_date', 'enrolled_date', 'withdrawn_date', 'owner_name', 'next_reservation_at', 'payment_method', 'memo']
  const updates: Record<string, string | null> = {}

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body || {}, key)) {
      const value = body[key]
      updates[key] = value === '' || value === undefined ? null : String(value).slice(0, 5000)
    }
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ status: 'ok', customer: data })
}
