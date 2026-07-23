import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildStaffCheckQuestion, resolveStaffTarget } from '@/lib/ai-secretary/staff-checks'
import { pushLineTextMessage } from '@/lib/line-push'

function isAuthorized(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || ''
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN
  return Boolean(requiredToken && token === requiredToken)
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('placeholder')) return null
  return createClient(url.replace(/\/+$/, ''), key)
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (process.env.STAFF_NOTIFY_ENABLED !== 'true') {
    return NextResponse.json({ error: 'staff_notify_disabled' }, { status: 400 })
  }

  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const lineInboxId = body.line_inbox_id
  if (!lineInboxId) {
    return NextResponse.json({ error: 'line_inbox_id_required' }, { status: 400 })
  }

  const { data: item, error } = await supabase
    .from('ai_secretary_line_inbox')
    .select('*')
    .eq('id', lineInboxId)
    .maybeSingle()

  if (error || !item) {
    return NextResponse.json({ error: error?.message || 'line_inbox_not_found' }, { status: 404 })
  }

  const target = resolveStaffTarget(item.service_category) || await resolveStaffTargetFromDb(supabase)
  if (!target) {
    return NextResponse.json({ error: 'staff_target_not_configured' }, { status: 400 })
  }

  const question = buildStaffCheckQuestion(item)
  const pushResult = await pushLineTextMessage(target.account_key, target.line_user_id, question)

  const memo = [
    `スタッフ通知: ${new Date().toISOString()}`,
    `宛先: ${target.name}`,
    `Push: ${pushResult.ok ? 'ok' : 'failed'}${pushResult.status ? ` (${pushResult.status})` : ''}`,
    pushResult.error ? `Error: ${pushResult.error}` : '',
  ].filter(Boolean).join('\n')

  await supabase
    .from('line_messages')
    .update({
      manual_memo: memo,
      status: pushResult.ok ? 'staff_notified' : item.status,
    })
    .eq('id', lineInboxId)

  await supabase.from('staff_check_tasks').insert({
    source_line_inbox_id: Number(lineInboxId),
    customer_id: item.customer_id || null,
    task_type: 'schedule_check',
    status: pushResult.ok ? 'notified' : 'push_failed',
    priority: 'normal',
    customer_name: item.line_display_name || item.customer_full_name || item.customer_parent_name || null,
    customer_message: item.body || '',
    question_to_staff: question,
    assigned_staff_name: target.name,
    staff_line_user_id: target.line_user_id,
    line_push_status: pushResult.status || null,
    line_push_ok: pushResult.ok,
    line_push_error: pushResult.error || null,
    notified_at: pushResult.ok ? new Date().toISOString() : null,
  }).then(() => null, () => null)

  return NextResponse.json({
    ok: pushResult.ok,
    target: { name: target.name, account_key: target.account_key },
    push: pushResult,
  }, { status: pushResult.ok ? 200 : 502 })
}

async function resolveStaffTargetFromDb(supabase: ReturnType<typeof createClient>) {
  const { data: accounts } = await supabase
    .from('staff_line_accounts')
    .select('staff_id,line_account_key,line_user_id,display_name,created_at')
    .order('created_at', { ascending: true })
    .limit(10)

  for (const account of accounts || []) {
    const { data: staff } = await supabase
      .from('staff_members')
      .select('id,name,is_active,notify_enabled')
      .eq('id', account.staff_id)
      .maybeSingle()

    if (staff?.is_active && staff?.notify_enabled) {
      return {
        name: staff.name || account.display_name || 'スタッフ',
        account_key: account.line_account_key,
        line_user_id: account.line_user_id,
      }
    }
  }

  return null
}
