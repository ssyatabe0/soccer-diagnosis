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

  const staff = isStaffLineUser(input.accountKey, input.lineUserId)
  if (!staff) return { handled: false }

  const parsed = parseStaffReply(input.text)
  if (!parsed.taskId) {
    return { handled: true, error: 'staff_reply_missing_task_id' }
  }

  const supabase = getServiceClient()
  if (!supabase) return { handled: true, error: 'supabase_not_configured' }

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

  return { handled: true, taskId: parsed.taskId, parentDraft }
}
