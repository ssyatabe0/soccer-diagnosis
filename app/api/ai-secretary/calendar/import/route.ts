import { NextRequest, NextResponse } from 'next/server'
import { cleanText, getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'
import { summarizeText } from '@/lib/ai-secretary/intelligence'

type CalendarPayload = {
  calendar_event_id?: string
  title?: string
  description?: string
  location?: string
  starts_at?: string
  ends_at?: string
  status?: string
  event_type?: string
}

export async function POST(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })

  const body = await request.json().catch(() => null)
  const events = Array.isArray(body?.events) ? body.events as CalendarPayload[] : []
  if (events.length === 0) return NextResponse.json({ error: 'events_required' }, { status: 400 })

  const { data: customers } = await supabase.from('customers').select('id,full_name,parent_name,child_name,team_name')
  const imported = []

  for (const event of events.slice(0, 100)) {
    const text = [event.title, event.description, event.location].filter(Boolean).join('\n')
    const matched = (customers || []).find((customer) => {
      const haystack = [customer.full_name, customer.parent_name, customer.child_name, customer.team_name].filter(Boolean).join(' ').toLowerCase()
      return haystack && text.toLowerCase().includes(haystack)
    })
    const customerId = matched?.id || null
    const startsAt = cleanText(event.starts_at, 80) || new Date().toISOString()
    const status = cleanText(event.status, 40) || (new Date(startsAt) < new Date() ? 'completed' : 'scheduled')
    const ticketUsageCandidate = status === 'completed' && /レッスン|lesson|練習|個人|足技|ドリブル/i.test(text)

    const { data, error } = await supabase.from('calendar_sync_sources').upsert({
      customer_id: customerId,
      calendar_event_id: cleanText(event.calendar_event_id, 200) || `manual-${Date.now()}-${imported.length}`,
      title: cleanText(event.title, 1000),
      description: cleanText(event.description, 5000),
      location: cleanText(event.location, 1000),
      starts_at: startsAt,
      ends_at: cleanText(event.ends_at, 80),
      event_type: cleanText(event.event_type, 40) || 'lesson',
      status,
      ticket_usage_candidate: ticketUsageCandidate,
      ai_summary: summarizeText(text, 'カレンダー予定'),
      raw_payload: event,
    }, { onConflict: 'calendar_event_id' }).select('*').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (customerId) {
      await supabase.from('customer_timeline_events').insert({
        customer_id: customerId,
        event_type: event.event_type === 'trial' ? 'trial' : 'calendar',
        title: `カレンダー: ${event.title || '予定'}`,
        body: data.ai_summary,
        source: 'calendar',
        source_table: 'calendar_sync_sources',
        source_id: String(data.id),
        occurred_at: startsAt,
      })
      if (status === 'scheduled') await supabase.from('customers').update({ next_reservation_at: startsAt, updated_at: new Date().toISOString() }).eq('id', customerId)
      if (ticketUsageCandidate) {
        const { data: contracts } = await supabase
          .from('ai_secretary_contracts')
          .select('id,product_name,remaining_count,effective_valid_until')
          .eq('customer_id', customerId)
          .in('status', ['active', 'paused'])
          .gt('remaining_count', 0)
          .order('effective_valid_until', { ascending: true, nullsFirst: false })
          .limit(1)

        const contract = contracts?.[0]
        await supabase.from('calendar_ticket_usage_candidates').upsert({
          customer_id: customerId,
          contract_id: contract?.id || null,
          calendar_source_id: data.id,
          candidate_date: startsAt.slice(0, 10),
          lesson_title: event.title || 'カレンダー連携レッスン',
          suggested_used_count: 1,
          status: 'pending',
          ai_reason: contract
            ? `Googleカレンダーの実施済み予定から回数券1回消化候補を作成しました。対象契約: ${contract.product_name || '契約'} / 残${contract.remaining_count ?? '-'}回`
            : 'Googleカレンダーの実施済み予定から回数券消化候補を作成しました。紐付く有効契約の確認が必要です。',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'calendar_source_id' })
      }
    }
    imported.push(data)
  }

  return NextResponse.json({ status: 'ok', count: imported.length, items: imported })
}
