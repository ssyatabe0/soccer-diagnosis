import { NextRequest, NextResponse } from 'next/server'
import { cleanText, getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'

export async function POST(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })

  const body = await request.json().catch(() => null)
  const customerId = cleanText(body?.customer_id, 80)
  if (!customerId) return NextResponse.json({ error: 'customer_id_required' }, { status: 400 })

  const task = {
    customer_id: customerId,
    contract_id: cleanText(body?.contract_id, 80),
    task_type: cleanText(body?.task_type, 80) || 'manual',
    title: cleanText(body?.title, 500) || '手動フォロー',
    due_date: cleanText(body?.due_date, 20) || new Date().toISOString().slice(0, 10),
    status: 'open',
    priority: cleanText(body?.priority, 20) || 'medium',
    ai_reason: cleanText(body?.ai_reason),
    notes: cleanText(body?.notes),
  }

  const { data, error } = await supabase.from('follow_tasks').insert(task).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('customer_timeline_events').insert({
    customer_id: customerId,
    event_type: 'memo',
    title: `フォロー作成: ${task.title}`,
    body: task.notes || task.ai_reason,
    source: 'admin',
    source_table: 'follow_tasks',
    source_id: String(data.id),
    occurred_at: new Date().toISOString(),
  })

  return NextResponse.json({ status: 'ok', task: data })
}

export async function PATCH(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })

  const body = await request.json().catch(() => null)
  const id = Number(body?.id)
  const status = cleanText(body?.status, 40) || 'done'
  if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

  const { data, error } = await supabase
    .from('follow_tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ status: 'ok', task: data })
}
