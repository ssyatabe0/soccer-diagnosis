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
  accountKey?: string | null
  lineReplyStatus?: number
  lineReplyOk?: boolean
}

type UserCandidate = {
  id: string
  name: string | null
  email: string | null
  prefecture: string | null
  type_name: string | null
  lane: string | null
  tags: string[] | null
  conversion_status: string | null
  line_user_id: string | null
  created_at: string | null
}

type ScoredCandidate = {
  user_id: string
  name: string | null
  email: string | null
  score: number
  confidence: 'high' | 'medium' | 'low'
  reasons: string[]
  profile: {
    prefecture: string | null
    type_name: string | null
    lane: string | null
    tags: string[]
    conversion_status: string | null
    created_at: string | null
  }
}

const LINE_ACCOUNT_KEY = process.env.LINE_ACCOUNT_KEY || 'soccer_private_lesson'
const AI_SECRETARY_DISABLED = process.env.AI_SECRETARY_DISABLED === 'true'

function normalizeAccountKey(value: string | null | undefined) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
  return normalized || LINE_ACCOUNT_KEY
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('placeholder')) return null
  return createClient(url.replace(/\/+$/, ''), key)
}

function summarizeIntent(text: string, extractedType: string | null) {
  if (extractedType) return 'diagnosis_result_followup'
  if (/予約|日程|空き|候補日|いつ/.test(text)) return 'booking'
  if (/体験|問い合わせ|相談|診断|お願い|興味/.test(text)) return 'inquiry'
  if (/回数|残り|期限|チケット|回券/.test(text)) return 'ticket_check'
  if (/ありがとう|助かり|良かった|変わった|できた/.test(text)) return 'positive_feedback'
  return 'line_message'
}

function summarizeLineMessage(text: string, extractedType: string | null) {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (extractedType) return `診断結果「${extractedType}」に関するLINE。追加相談・個別案内の可能性あり。`
  if (/予約|日程|空き|候補日|いつ/.test(text)) return `日程・予約に関するLINE: ${trimmed.slice(0, 120)}`
  if (/体験|問い合わせ|相談|診断|お願い|興味/.test(text)) return `問い合わせ・相談系LINE: ${trimmed.slice(0, 120)}`
  if (/回数|残り|期限|チケット|回券/.test(text)) return `回数券・期限確認系LINE: ${trimmed.slice(0, 120)}`
  return trimmed.slice(0, 240)
}

function buildDraft(text: string, extractedType: string | null, topCandidate?: ScoredCandidate | null) {
  const nameLine = topCandidate?.name ? `${topCandidate.name}様` : ''

  if (extractedType) {
    return [
      nameLine,
      '診断結果を確認しました。',
      `タイプは「${extractedType}」です。`,
      '必要であれば、動画や現在のお悩みを送っていただければ、次に見るべきポイントを整理します。',
      '',
      '谷田部',
    ].filter(Boolean).join('\n')
  }

  if (/予約|日程|空き|候補日|いつ/.test(text)) {
    return [
      nameLine,
      'ご連絡ありがとうございます。',
      '日程の件、確認しました。こちらで空き状況を見て、候補日を整理してご連絡します。',
      'お子さまの現在の状況も踏まえて、次回の内容を組み立てます。',
      '',
      '谷田部',
    ].filter(Boolean).join('\n')
  }

  return [
    nameLine,
    'ご連絡ありがとうございます。',
    '内容確認しました。',
    'お子さまのお名前、学年、所属チーム、現在のお悩み、希望日程を教えていただけると確認してご案内できます。',
    '',
    '谷田部',
  ].filter(Boolean).join('\n')
}

async function findUserCandidates(supabase: ReturnType<typeof createClient>, lineUserId: string, text: string, extractedType: string | null) {
  const candidates = new Map<string, ScoredCandidate>()

  if (lineUserId) {
    const { data: exactUsers } = await supabase
      .from('users')
      .select('id,name,email,prefecture,type_name,lane,tags,conversion_status,line_user_id,created_at')
      .eq('line_user_id', lineUserId)
      .limit(5)

    for (const user of (exactUsers || []) as UserCandidate[]) {
      candidates.set(user.id, scoreUser(user, text, extractedType, lineUserId))
    }
  }

  const { data: recentUsers } = await supabase
    .from('users')
    .select('id,name,email,prefecture,type_name,lane,tags,conversion_status,line_user_id,created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  for (const user of (recentUsers || []) as UserCandidate[]) {
    const scored = scoreUser(user, text, extractedType, lineUserId)
    if (scored.score > 0 || candidates.has(user.id)) {
      const existing = candidates.get(user.id)
      if (!existing || scored.score > existing.score) candidates.set(user.id, scored)
    }
  }

  return [...candidates.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}

function scoreUser(user: UserCandidate, text: string, extractedType: string | null, lineUserId: string): ScoredCandidate {
  const haystack = text.toLowerCase()
  let score = 0
  const reasons: string[] = []

  if (lineUserId && user.line_user_id === lineUserId) {
    score += 100
    reasons.push('LINE userId一致')
  }

  for (const [label, value] of [
    ['名前', user.name],
    ['メール', user.email],
    ['都道府県', user.prefecture],
    ['診断タイプ', user.type_name],
  ] as const) {
    const normalized = String(value || '').toLowerCase().trim()
    if (normalized && haystack.includes(normalized)) {
      score += label === 'メール' ? 80 : 25
      reasons.push(`${label}に言及`)
    }
  }

  for (const tag of user.tags || []) {
    const normalized = String(tag).toLowerCase().trim()
    if (normalized && haystack.includes(normalized)) {
      score += 15
      reasons.push(`タグ「${tag}」に言及`)
    }
  }

  if (extractedType && user.type_name === extractedType) {
    score += 35
    reasons.push('診断タイプ一致')
  }

  if (/セレクション|選抜|トライアル/.test(text) && (user.tags || []).includes('selection')) {
    score += 15
    reasons.push('セレクション相談傾向')
  }

  const confidence: 'high' | 'medium' | 'low' = score >= 100 ? 'high' : score >= 35 ? 'medium' : 'low'

  return {
    user_id: user.id,
    name: user.name,
    email: user.email,
    score,
    confidence,
    reasons,
    profile: {
      prefecture: user.prefecture,
      type_name: user.type_name,
      lane: user.lane,
      tags: user.tags || [],
      conversion_status: user.conversion_status,
      created_at: user.created_at,
    },
  }
}

export async function saveLineMessageForAiSecretary(input: SaveLineMessageInput) {
  if (AI_SECRETARY_DISABLED) return { saved: false, reason: 'disabled' }

  const supabase = getServiceClient()
  if (!supabase) return { saved: false, reason: 'supabase_not_configured' }

  const event = input.event
  const lineUserId = event.source?.userId || ''
  const accountKey = normalizeAccountKey(input.accountKey)
  const occurredAt = event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString()
  const intent = summarizeIntent(input.text, input.extractedType)
  const candidates = await findUserCandidates(supabase, lineUserId, input.text, input.extractedType)
  const topCandidate = candidates[0] || null
  const matchedUserId = topCandidate && topCandidate.confidence === 'high' ? topCandidate.user_id : null
  const aiReplyDraft = buildDraft(input.text, input.extractedType, topCandidate)

  const { error } = await supabase.from('line_messages').insert({
    account_key: accountKey,
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
    ai_summary: summarizeLineMessage(input.text, input.extractedType),
    ai_reply_draft: aiReplyDraft,
    matched_user_id: matchedUserId,
    customer_candidates: candidates,
    match_confidence: topCandidate?.confidence || null,
    match_reasons: topCandidate?.reasons || [],
    line_reply_status: input.lineReplyStatus || null,
    line_reply_ok: input.lineReplyOk ?? null,
    raw_event: event,
    occurred_at: occurredAt,
    status: matchedUserId ? 'matched' : 'needs_review',
  })

  if (error) {
    console.error('line_messages insert error:', error.message)
    return { saved: false, reason: error.message }
  }

  return { saved: true, matchedUserId, candidateCount: candidates.length }
}
