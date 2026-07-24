import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildStaffCheckQuestion, parseStaffTargetsFromEnv, StaffTarget } from '@/lib/ai-secretary/staff-checks'
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

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })
  }

  const { data: accounts, error: accountError } = await supabase
    .from('staff_line_accounts')
    .select('staff_id,line_account_key,line_user_id,display_name,created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (accountError) {
    return NextResponse.json({ error: accountError.message }, { status: 500 })
  }

  const staffIds = Array.from(new Set((accounts || []).map((account) => account.staff_id).filter(Boolean)))
  const { data: staffRows } = staffIds.length
    ? await supabase
      .from('staff_members')
      .select('id,name,role,is_active,notify_enabled,created_at')
      .in('id', staffIds)
    : { data: [] }

  const staffById = new Map((staffRows || []).map((staff) => [staff.id, staff]))
  const staffTargets = (accounts || []).map((account) => {
    const staff = staffById.get(account.staff_id)
    const lineUserId = String(account.line_user_id || '')
    return {
      staff_id: account.staff_id,
      name: staff?.name || account.display_name || 'スタッフ',
      role: staff?.role || null,
      is_active: staff?.is_active ?? null,
      notify_enabled: staff?.notify_enabled ?? null,
      line_account_key: account.line_account_key,
      line_user_id_tail: lineUserId ? lineUserId.slice(-8) : null,
      display_name: account.display_name,
      created_at: account.created_at,
    }
  })

  const { data: scheduleCandidates, error: candidateError } = await supabase
    .from('ai_secretary_line_inbox')
    .select('id,customer_id,account_key,account_display_name,body,ai_summary,occurred_at,customer_full_name,customer_parent_name,customer_child_name,service_category,status')
    .order('occurred_at', { ascending: false })
    .limit(30)

  if (candidateError) {
    return NextResponse.json({ error: candidateError.message }, { status: 500 })
  }

  const { data: recentTasks } = await supabase
    .from('staff_check_tasks')
    .select('id,source_line_inbox_id,status,customer_name,assigned_staff_name,line_push_ok,line_push_status,line_push_error,notified_at,created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    ok: true,
    staff_targets: staffTargets,
    schedule_candidates: scheduleCandidates || [],
    recent_tasks: recentTasks || [],
  })
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

  const targets = await resolveStaffTargets(supabase, item.service_category)
  if (targets.length === 0) {
    return NextResponse.json({ error: 'staff_target_not_configured' }, { status: 400 })
  }

  const question = buildStaffCheckQuestion(item)
  const pushResults = await Promise.all(targets.map(async (target) => ({
    target,
    push: await pushLineTextMessage(target.account_key, target.line_user_id, question),
  })))
  const hasSuccess = pushResults.some((result) => result.push.ok)

  const memo = [
    `スタッフ通知: ${new Date().toISOString()}`,
    ...pushResults.map(({ target, push }) => [
      `宛先: ${target.name}`,
      `Push: ${push.ok ? 'ok' : 'failed'}${push.status ? ` (${push.status})` : ''}`,
      push.error ? `Error: ${push.error}` : '',
    ].filter(Boolean).join(' / ')),
  ].filter(Boolean).join('\n')

  await supabase
    .from('line_messages')
    .update({
      manual_memo: memo,
      status: hasSuccess ? 'staff_notified' : item.status,
    })
    .eq('id', lineInboxId)

  await supabase.from('staff_check_tasks').insert(pushResults.map(({ target, push }) => ({
    source_line_inbox_id: Number(lineInboxId),
    customer_id: item.customer_id || null,
    task_type: 'schedule_check',
    status: push.ok ? 'notified' : 'push_failed',
    priority: 'normal',
    customer_name: item.line_display_name || item.customer_full_name || item.customer_parent_name || null,
    customer_message: item.body || '',
    question_to_staff: question,
    assigned_staff_name: target.name,
    staff_line_user_id: target.line_user_id,
    line_push_status: push.status || null,
    line_push_ok: push.ok,
    line_push_error: push.error || null,
    notified_at: push.ok ? new Date().toISOString() : null,
  }))).then(() => null, () => null)

  return NextResponse.json({
    ok: hasSuccess,
    targets: pushResults.map(({ target, push }) => ({
      name: target.name,
      account_key: target.account_key,
      ok: push.ok,
      status: push.status || null,
      error: push.error || null,
    })),
  }, { status: hasSuccess ? 200 : 502 })
}

async function resolveStaffTargets(supabase: ReturnType<typeof createClient>, serviceCategory?: string | null) {
  const envTargets = parseStaffTargetsFromEnv().filter((target) => (
    !target.services ||
    target.services.length === 0 ||
    target.services.includes(serviceCategory || '')
  ))
  const dbTargets = await resolveStaffTargetsFromDb(supabase)
  return dedupeStaffTargets([...envTargets, ...dbTargets])
}

async function resolveStaffTargetsFromDb(supabase: ReturnType<typeof createClient>) {
  const { data: accounts } = await supabase
    .from('staff_line_accounts')
    .select('staff_id,line_account_key,line_user_id,display_name,created_at')
    .order('created_at', { ascending: true })
    .limit(50)

  const targets: StaffTarget[] = []
  for (const account of accounts || []) {
    const { data: staff } = await supabase
      .from('staff_members')
      .select('id,name,is_active,notify_enabled')
      .eq('id', account.staff_id)
      .maybeSingle()

    if (staff?.is_active && staff?.notify_enabled) {
      targets.push({
        name: staff.name || account.display_name || 'スタッフ',
        account_key: account.line_account_key,
        line_user_id: account.line_user_id,
      })
    }
  }

  return targets
}

function dedupeStaffTargets(targets: StaffTarget[]) {
  const seen = new Set<string>()
  return targets.filter((target) => {
    const key = `${target.account_key}:${target.line_user_id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
