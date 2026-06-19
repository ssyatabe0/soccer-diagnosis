import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'

export async function GET(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })

  const q = new URL(request.url).searchParams.get('q')?.trim() || ''
  if (!q) return NextResponse.json({ query: q, count: 0, items: [] })

  const rule = ruleFor(q)
  if (rule.salesType) {
    const { data, error } = await supabase.from('ai_secretary_sales_candidates').select('*').eq('candidate_type', rule.salesType).limit(100)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ query: q, mode: 'sales_candidate', count: data?.length || 0, items: data || [] })
  }

  let customerQuery = supabase.from('ai_secretary_customers').select('*').limit(100)
  if (rule.serviceType) customerQuery = customerQuery.eq('service_type', rule.serviceType)
  if (rule.status) customerQuery = customerQuery.eq('status', rule.status)
  const { data: customers, error: customerError } = await customerQuery
  if (customerError) return NextResponse.json({ error: customerError.message }, { status: 500 })

  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const filtered = (customers || []).filter((customer) => {
    const text = [customer.full_name, customer.parent_name, customer.child_name, customer.grade, customer.region, customer.team_name, customer.memo, customer.service_type, customer.status, ...(customer.line_account_names || [])].filter(Boolean).join(' ').toLowerCase()
    return words.every((word) => text.includes(word.toLowerCase())) || rule.looseWords.some((word) => text.includes(word))
  })

  if (filtered.length > 0) return NextResponse.json({ query: q, mode: 'customer', count: filtered.length, items: filtered })

  const { data: timelines, error: timelineError } = await supabase.from('customer_timeline_events').select('*, customers(full_name,parent_name,child_name,service_type,status)').or(`title.ilike.%${escapeLike(q)}%,body.ilike.%${escapeLike(q)}%`).limit(100)
  if (timelineError) return NextResponse.json({ error: timelineError.message }, { status: 500 })
  return NextResponse.json({ query: q, mode: 'timeline', count: timelines?.length || 0, items: timelines || [] })
}

function ruleFor(q: string) {
  const lower = q.toLowerCase()
  if (q.includes('レビュー')) return { salesType: 'review_request', looseWords: [] as string[] }
  if (q.includes('足技塾からSYSC') || q.includes('SYSC候補')) return { salesType: 'sysc_candidate', looseWords: [] as string[] }
  if (q.includes('再提案')) return { salesType: 'private_lesson_reproposal', looseWords: [] as string[] }
  if (q.includes('今月売上')) return { salesType: null, serviceType: null, status: null, looseWords: ['new_inquiry', 'trial_scheduling'] }
  if (q.includes('辞めた') || q.includes('退会')) return { salesType: null, serviceType: null, status: 'withdrawn', looseWords: ['退会', 'withdrawn'] }
  if (q.includes('グアム') || lower.includes('guam')) return { salesType: null, serviceType: 'overseas', status: null, looseWords: ['グアム', 'guam'] }
  if (lower.includes('mls next')) return { salesType: null, serviceType: 'overseas', status: null, looseWords: ['mls next', 'mls'] }
  return { salesType: null, serviceType: null, status: null, looseWords: q.toLowerCase().split(/\s+/).filter(Boolean) }
}

function escapeLike(value: string) {
  return value.replace(/[%,]/g, '')
}
