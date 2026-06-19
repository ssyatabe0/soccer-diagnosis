import { NextRequest, NextResponse } from 'next/server'
import { cleanNumber, cleanText, getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'

export async function POST(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })

  const body = await request.json().catch(() => null)
  const customerId = cleanText(body?.customer_id, 80)
  const contractId = cleanText(body?.contract_id, 80)
  if (!customerId || !contractId) return NextResponse.json({ error: 'customer_id_and_contract_id_required' }, { status: 400 })

  const usage = {
    customer_id: customerId,
    contract_id: contractId,
    usage_date: cleanText(body?.usage_date, 20) || new Date().toISOString().slice(0, 10),
    used_count: cleanNumber(body?.used_count) || 1,
    lesson_title: cleanText(body?.lesson_title, 500),
    notes: cleanText(body?.notes),
    source: 'admin_manual',
  }

  const { data, error } = await supabase.from('ticket_usage').insert(usage).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('customer_timeline_events').insert({
    customer_id: customerId,
    event_type: 'calendar',
    title: `回数券 ${usage.used_count}回消化`,
    body: usage.lesson_title || usage.notes || '管理画面から回数券消化を登録しました。',
    source: 'admin',
    source_table: 'ticket_usage',
    source_id: String(data.id),
    occurred_at: `${usage.usage_date}T00:00:00+09:00`,
  })

  return NextResponse.json({ status: 'ok', usage: data })
}
