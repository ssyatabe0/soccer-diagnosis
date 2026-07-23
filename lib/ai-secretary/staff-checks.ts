export type StaffTarget = {
  name: string
  account_key: string
  line_user_id: string
  services?: string[]
}

export type StaffCheckLineItem = {
  id: number | string
  customer_id?: string | null
  account_key?: string | null
  account_display_name?: string | null
  line_user_id?: string | null
  line_display_name?: string | null
  body?: string | null
  intent?: string | null
  ai_summary?: string | null
  ai_reply_draft?: string | null
  occurred_at?: string | null
  customer_full_name?: string | null
  customer_parent_name?: string | null
  customer_child_name?: string | null
  service_category?: string | null
}

export function parseStaffTargetsFromEnv(): StaffTarget[] {
  const raw = process.env.STAFF_NOTIFY_TARGETS
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as Array<Partial<StaffTarget>>
    return parsed
      .filter((target) => target.name && target.account_key && target.line_user_id)
      .map((target) => ({
        name: String(target.name),
        account_key: String(target.account_key),
        line_user_id: String(target.line_user_id),
        services: Array.isArray(target.services) ? target.services.map(String) : [],
      }))
  } catch {
    return []
  }
}

export function resolveStaffTarget(serviceCategory?: string | null) {
  const targets = parseStaffTargetsFromEnv()
  if (targets.length === 0) return null

  const normalizedService = serviceCategory || ''
  return (
    targets.find((target) => target.services?.includes(normalizedService)) ||
    targets.find((target) => !target.services || target.services.length === 0) ||
    targets[0]
  )
}

export function isStaffLineUser(accountKey: string, lineUserId: string) {
  if (!lineUserId) return null
  return (
    parseStaffTargetsFromEnv().find((target) => target.account_key === accountKey && target.line_user_id === lineUserId) ||
    parseStaffTargetsFromEnv().find((target) => target.line_user_id === lineUserId) ||
    null
  )
}

export function formatStaffDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function inferStaffCustomerName(item: StaffCheckLineItem) {
  return (
    item.line_display_name ||
    item.customer_full_name ||
    item.customer_parent_name ||
    item.customer_child_name ||
    inferNameFromText(item.body || '') ||
    `${formatStaffDate(item.occurred_at).replace(/\s.*/, '')}のLINE相談`
  )
}

export function inferNameFromText(text: string) {
  const patterns = [
    /(?:保護者|お名前|名前|氏名)[:：\s]*([一-龥ぁ-んァ-ンA-Za-zー・\s]{2,18})/,
    /([一-龥ぁ-んァ-ンA-Za-zー・]{2,18})です[。！!\s\n]/,
    /([一-龥ぁ-んァ-ンA-Za-zー・]{2,18})と申します/,
    /([一-龥ぁ-んァ-ンA-Za-zー・]{2,18})さん/,
  ]

  for (const pattern of patterns) {
    const value = text.match(pattern)?.[1]?.trim()
    if (value && !/(お願い|ありがとう|よろしく|ございます|できます|しました|ください|候補|日程|予定|確認|レッスン)/.test(value)) {
      return value
    }
  }

  return null
}

export function isScheduleCheckCandidate(item: StaffCheckLineItem) {
  const text = `${item.intent || ''}\n${item.ai_summary || ''}\n${item.body || ''}`
  return /(booking|日程|予定|予約|候補|何時|何曜日|月曜|火曜|水曜|木曜|金曜|土曜|日曜|午前|午後|時|場所|レッスン|体験|調整)/.test(text)
}

export function buildStaffCheckQuestion(item: StaffCheckLineItem) {
  const name = inferStaffCustomerName(item)
  const compactBody = (item.body || '').replace(/\s+/g, ' ').slice(0, 500)
  const taskId = item.id

  return `【スタッフ確認 / TASK:${taskId}】

顧客: ${name}
LINE公式: ${item.account_display_name || item.account_key || 'LINE'}
受信: ${formatStaffDate(item.occurred_at)}

保護者から日程相談が来ています。

内容:
${compactBody}

確認してほしいこと:
・対応可能な候補日時
・場所
・担当可能か
・注意点

返信はこの形式でお願いします。
先頭の TASK:${taskId} は消さないでください。

TASK:${taskId}
候補:
不可:
場所:
補足:`
}

export function parseStaffReply(text: string) {
  const get = (label: string) => {
    const match = text.match(new RegExp(`${label}[:：]\\s*([\\s\\S]*?)(?=\\n(?:候補|不可|場所|補足)[:：]|$)`))
    return match?.[1]?.trim() || ''
  }

  return {
    taskId: text.match(/TASK[:：]\s*(\d+)/i)?.[1] || null,
    candidates: get('候補'),
    unavailable: get('不可'),
    place: get('場所'),
    note: get('補足'),
  }
}

export function buildParentDraftFromStaffReply(item: StaffCheckLineItem, staffReplyText: string) {
  const parsed = parseStaffReply(staffReplyText)
  const lines = [
    'ご連絡ありがとうございます。',
    '',
    '日程を確認したところ、以下で調整可能です。',
    '',
  ]

  if (parsed.candidates) lines.push(`候補日時:\n${parsed.candidates}`, '')
  if (parsed.place) lines.push(`場所:\n${parsed.place}`, '')
  if (parsed.note) lines.push(`補足:\n${parsed.note}`, '')

  if (!parsed.candidates && !parsed.place && !parsed.note) {
    lines.push('スタッフ確認内容をもとに、候補日時を整理してご案内します。', '')
  }

  lines.push('ご都合の良い候補をお知らせください。', '', '谷田部')
  return lines.join('\n')
}
