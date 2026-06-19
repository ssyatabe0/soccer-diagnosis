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
  const limit = Math.min(Number(searchParams.get('limit') || 200), 500)
  const expectedMonth = searchParams.get('month') || new Date().toISOString().slice(0, 7) + '-01'

  const [{ data: candidates, error: candidatesError }, { data: followTasks, error: followError }] = await Promise.all([
    supabase
      .from('ai_secretary_sales_candidates')
      .select('*')
      .eq('expected_month', expectedMonth)
      .order('priority', { ascending: true })
      .limit(limit),
    supabase
      .from('follow_tasks')
      .select('*, customers(full_name,parent_name,child_name,service_type,status)')
      .eq('status', 'open')
      .gte('due_date', expectedMonth)
      .lt('due_date', nextMonth(expectedMonth))
      .order('due_date', { ascending: true })
      .limit(limit),
  ])

  if (candidatesError) return NextResponse.json({ error: candidatesError.message }, { status: 500 })
  if (followError) return NextResponse.json({ error: followError.message }, { status: 500 })

  const items = candidates || []
  const expiring = items.filter((item) => ['expiry_30', 'expiry_14', 'expiry_7'].includes(item.candidate_type))
  const follow = [
    ...items.filter((item) => ['remaining_1', 'remaining_2', 'unused_90', 'review_request', 'ashiwaza_candidate', 'sysc_candidate', 'private_lesson_reproposal'].includes(item.candidate_type)),
    ...(followTasks || []).map((task) => ({ ...task, candidate_type: task.task_type, ai_reason: task.ai_reason, source: 'follow_tasks' })),
  ]

  return NextResponse.json({
    month: expectedMonth,
    counts: {
      revenue_candidates: items.length,
      expiring_candidates: expiring.length,
      follow_targets: follow.length,
    },
    revenue_candidates: items,
    expiring_candidates: expiring,
    follow_targets: follow,
  })
}

function nextMonth(monthStart: string) {
  const date = new Date(monthStart + 'T00:00:00.000Z')
  date.setUTCMonth(date.getUTCMonth() + 1)
  return date.toISOString().slice(0, 10)
}
