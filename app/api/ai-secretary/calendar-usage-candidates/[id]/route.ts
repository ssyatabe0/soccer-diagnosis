import { NextRequest, NextResponse } from 'next/server'
import { cleanNumber, cleanText, getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAiSecretaryAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })

  const { id } = await params
  const body = await request.json().catch(() => null)
  const action = cleanText(body?.action, 40)
  const notes = cleanText(body?.notes)

  const { data: candidate, error: candidateError } = await supabase.from('calendar_ticket_usage_candidates').select('*').eq('id', id).single()
  if (candidateError) return NextResponse.json({ error: candidateError.message }, { status: 500 })
  if (candidate.status !== 'pending') return NextResponse.json({ error: 'candidate_already_handled' }, { status: 400 })

  if (action === 'dismiss') {
    const { data, error } = await supabase.from('calendar_ticket_usage_candidates').update({ status: 'dismissed', dismissed_at: new Date().toISOString(), notes, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ status: 'ok', candidate: data })
  }

  if (action !== 'confirm') return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  if (!candidate.customer_id || !candidate.contract_id) return NextResponse.json({ error: 'customer_or_contract_missing' }, { status: 400 })

  const usedCount = cleanNumber(body?.used_count) || candidate.suggested_used_count || 1
  const { data: usage, error: usageError } = await supabase.from('ticket_usage').insert({
    customer_id: candidate.customer_id,
    contract_id: candidate.contract_id,
    usage_date: candidate.candidate_date,
    used_count: usedCount,
    lesson_title: candidate.lesson_title,
    source: 'calendar_confirmed',
    notes: notes || candidate.ai_reason,
  }).select('*').single()
  if (usageError) return NextResponse.json({ error: usageError.message }, { status: 500 })

  const { data, error } = await supabase.from('calendar_ticket_usage_candidates').update({
    status: 'confirmed',
    confirmed_usage_id: usage.id,
    confirmed_at: new Date().toISOString(),
    notes,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('customer_timeline_events').insert({
    customer_id: candidate.customer_id,
    event_type: 'calendar',
    title: `カレンダー確認で回数券 ${usedCount}回消化`,
    body: candidate.lesson_title || candidate.ai_reason || 'カレンダー予定から谷田部確認後に回数券消化を確定しました。',
    source: 'calendar_confirmed',
    source_table: 'calendar_ticket_usage_candidates',
    source_id: String(candidate.id),
    occurred_at: `${candidate.candidate_date}T00:00:00+09:00`,
  })

  return NextResponse.json({ status: 'ok', candidate: data, usage })
}
