import { createClient } from '@supabase/supabase-js'

type LineWebhookEvent = {
  type: string
  replyToken?: string
  timestamp?: number
  source?: {
    type?: string
    userId?: string
    groupId?: string
    roomId?: string
  }
  message?: {
    id?: string
    type?: string
    text?: string
  }
}

type SaveLineMessageInput = {
  event: LineWebhookEvent
  text: string
  extractedType: string | null
  autoReplyText: string
  lineReplyStatus?: number
  lineReplyOk?: boolean
}

const LINE_ACCOUNT_KEY = process.env.LINE_ACCOUNT_KEY || 'soccer_private_lesson'
const AI_SECRETARY_DISABLED = process.env.AI_SECRETARY_DISABLED === 'true'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('placeholder')) return null
  return createClient(url.replace(/\/+$/, ''), key)
}

function summarizeIntent(text: string, extractedType: string | null) {
  if (extractedType) return 'diagnosis_result_followup'
  if (/予約|日程|空き/.test(text)) return 'booking'
  if (/体験|問い合わせ|相談|診断/.test(text)) return 'inquiry'
  if (/回数|残り|期限/.test(text)) return 'ticket_check'
  return 'line_message'
}

function buildDraft(text: string, extractedType: string | null) {
  if (extractedType) {
    return [
      '診断結果を確認しました。',
      `タイプは「${extractedType}」です。`,
      '必要であれば、動画や現在のお悩みを送っていただければ、次に見るべきポイントを整理します。',
      '',
      '谷田部',
    ].join('\n')
  }

  return [
    'ご連絡ありがとうございます。',
    '内容確認しました。',
    'お子さまのお名前、学年、所属チーム、現在のお悩み、希望日程を教えていただけると確認してご案内できます。',
    '',
    '谷田部',
  ].join('\n')
}

export async function saveLineMessageForAiSecretary(input: SaveLineMessageInput) {
  if (AI_SECRETARY_DISABLED) return { saved: false, reason: 'disabled' }

  const supabase = getServiceClient()
  if (!supabase) return { saved: false, reason: 'supabase_not_configured' }

  const event = input.event
  const lineUserId = event.source?.userId || ''
  const occurredAt = event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString()
  const intent = summarizeIntent(input.text, input.extractedType)
  const aiReplyDraft = buildDraft(input.text, input.extractedType)

  const { data: existingUser } = lineUserId
    ? await supabase
        .from('users')
        .select('id')
        .eq('line_user_id', lineUserId)
        .maybeSingle()
    : { data: null }

  const customerId = existingUser?.id || null

  const { error } = await supabase.from('line_messages').insert({
    account_key: LINE_ACCOUNT_KEY,
    line_user_id: lineUserId || null,
    line_source_type: event.source?.type || null,
    line_group_id: event.source?.groupId || null,
    line_room_id: event.source?.roomId || null,
    line_message_id: event.message?.id || null,
    reply_token_present: Boolean(event.replyToken),
    direction: 'inbound',
    body: input.text,
    extracted_type: input.extractedType,
    intent,
    ai_summary: input.text.slice(0, 240),
    ai_reply_draft: aiReplyDraft,
    matched_user_id: customerId,
    line_reply_status: input.lineReplyStatus || null,
    line_reply_ok: input.lineReplyOk ?? null,
    raw_event: event,
    occurred_at: occurredAt,
    status: customerId ? 'matched' : 'needs_review',
  })

  if (error) {
    console.error('line_messages insert error:', error.message)
    return { saved: false, reason: error.message }
  }

  return { saved: true, matchedUserId: customerId }
}
