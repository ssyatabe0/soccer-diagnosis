import { createClient } from '@supabase/supabase-js'
import { buildParentDraftFromStaffReply, isStaffLineUser, parseStaffReply } from './staff-checks'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('placeholder')) return null
  return createClient(url.replace(/\/+$/, ''), key)
}

export async function handleStaffLineReply(input: {
  accountKey: string
  lineUserId: string
  text: string
  event: unknown
}) {
  if (process.env.STAFF_REPLY_INTAKE_ENABLED === 'false') return { handled: false }

  const supabase = getServiceClient()
  if (!supabase) return { handled: true, error: 'supabase_not_configured' }

  const registrationName = input.text.match(/^スタッフ登録\s+(.{1,30})$/)?.[1]?.trim()
  if (registrationName) {
    const staff = await registerStaffLineAccount(supabase, {
      name: registrationName,
      accountKey: input.accountKey,
      lineUserId: input.lineUserId,
    })

    return {
      handled: true,
      replyText: staff.ok
        ? `スタッフ登録しました。\n名前: ${registrationName}\nこのLINEに日程確認が届くようになります。`
        : `スタッフ登録に失敗しました。\n${staff.error || 'Supabaseのstaffテーブル確認が必要です。'}`,
    }
  }

  const staff = isStaffLineUser(input.accountKey, input.lineUserId) || await findStaffByLineAccount(supabase, input.accountKey, input.lineUserId)
  if (!staff) return { handled: false }

  const parsed = parseStaffReply(input.text)
  if (!parsed.taskId) {
    return { handled: true, error: 'staff_reply_missing_task_id', replyText: 'TASK番号が見つかりません。通知文のTASK行を残して返信してください。' }
  }

  const { data: lineItem, error: lineError } = await supabase
    .from('ai_secretary_line_inbox')
    .select('*')
    .eq('id', parsed.taskId)
    .maybeSingle()

  if (lineError || !lineItem) {
    return { handled: true, error: lineError?.message || 'source_line_not_found' }
  }

  const parentDraft = buildParentDraftFromStaffReply(lineItem, input.text)
  const staffMemo = [
    `スタッフ返信取り込み: ${new Date().toISOString()}`,
    `スタッフ: ${staff.name}`,
    input.text,
  ].join('\n')

  await supabase
    .from('line_messages')
    .update({
      ai_reply_draft: parentDraft,
      manual_memo: staffMemo,
      status: 'staff_replied',
    })
    .eq('id', parsed.taskId)

  await supabase.from('staff_check_replies').insert({
    source_line_inbox_id: Number(parsed.taskId),
    staff_name: staff.name,
    staff_line_user_id: input.lineUserId,
    reply_body: input.text,
    parsed_candidates: parsed.candidates,
    parsed_place: parsed.place,
    parsed_note: parsed.note,
    ai_parent_reply_draft: parentDraft,
    raw_event: input.event,
  }).then(() => null, () => null)

  return { handled: true, taskId: parsed.taskId, parentDraft, replyText: '確認内容をAI秘書に取り込みました。谷田部確認用の返信下書きに反映します。' }
}

async function registerStaffLineAccount(
  supabase: ReturnType<typeof createClient>,
  input: { name: string; accountKey: string; lineUserId: string },
) {
  try {
    const { data: existingStaff } = await supabase
      .from('staff_members')
      .select('id,name')
      .eq('name', input.name)
      .maybeSingle()

    let staffId = existingStaff?.id as string | undefined
    if (!staffId) {
      const { data: insertedStaff, error: insertError } = await supabase
        .from('staff_members')
        .insert({ name: input.name, role: 'coach', is_active: true, notify_enabled: true })
        .select('id')
        .single()

      if (insertError) return { ok: false, error: insertError.message }
      staffId = insertedStaff.id
    }

    const { error: lineError } = await supabase
      .from('staff_line_accounts')
      .upsert({
        staff_id: staffId,
        line_account_key: input.accountKey,
        line_user_id: input.lineUserId,
        display_name: input.name,
      }, { onConflict: 'line_account_key,line_user_id' })

    if (lineError) return { ok: false, error: lineError.message }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'staff registration failed' }
  }
}

async function findStaffByLineAccount(supabase: ReturnType<typeof createClient>, accountKey: string, lineUserId: string) {
  const { data: account } = await supabase
    .from('staff_line_accounts')
    .select('staff_id,line_account_key,line_user_id,display_name')
    .eq('line_account_key', accountKey)
    .eq('line_user_id', lineUserId)
    .maybeSingle()

  if (!account) return null

  const { data: staff } = await supabase
    .from('staff_members')
    .select('id,name,is_active,notify_enabled')
    .eq('id', account.staff_id)
    .maybeSingle()

  if (!staff?.is_active || !staff?.notify_enabled) return null
  return {
    name: staff.name || account.display_name || 'スタッフ',
    account_key: account.line_account_key,
    line_user_id: account.line_user_id,
  }
}
