export type HistorySource = {
  body?: string | null
  ai_summary?: string | null
  occurred_at?: string | null
  source?: 'line' | 'gmail' | 'calendar' | 'memo'
}

export type CustomerHistoryIntelligence = {
  first_contact_at?: string
  inquiry_date?: string
  trial_date?: string
  first_lesson_start_date?: string
  days_since_first_lesson?: number
  inferred_product?: string
  inferred_ticket_count?: number
  inferred_valid_until?: string
  inferred_validity_days?: number
  latest_contact_at?: string
  summary: string
  hints: string[]
}

function dateOnly(value: string | null | undefined) {
  if (!value) return ''
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
}

function todayJst() {
  return dateOnly(new Date().toISOString())
}

function addDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T00:00:00+09:00`)
  date.setDate(date.getDate() + days)
  return dateOnly(date.toISOString())
}

function diffDays(startDate: string, endDate = todayJst()) {
  const start = new Date(`${startDate}T00:00:00+09:00`).getTime()
  const end = new Date(`${endDate}T00:00:00+09:00`).getTime()
  return Math.max(0, Math.floor((end - start) / 86400000))
}

function normalizeDigits(value: string) {
  return value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
}

function parseDateFromText(text: string, occurredAt?: string | null) {
  const normalized = normalizeDigits(text)
  const baseYear = occurredAt ? Number(dateOnly(occurredAt).slice(0, 4)) : Number(todayJst().slice(0, 4))
  const full = normalized.match(/(20\d{2})[年\/\-.](\d{1,2})[月\/\-.](\d{1,2})日?/)
  if (full) return `${full[1]}-${full[2].padStart(2, '0')}-${full[3].padStart(2, '0')}`
  const monthDay = normalized.match(/(?:^|[^\d])(\d{1,2})[月\/\-.](\d{1,2})日?(?:[^\d]|$)/)
  if (monthDay) return `${baseYear}-${monthDay[1].padStart(2, '0')}-${monthDay[2].padStart(2, '0')}`
  if (/今日/.test(text) && occurredAt) return dateOnly(occurredAt)
  if (/明日/.test(text) && occurredAt) return addDays(dateOnly(occurredAt), 1)
  return ''
}

function firstByKeyword(sources: HistorySource[], keyword: RegExp) {
  return sources.find((source) => keyword.test(`${source.body || ''}\n${source.ai_summary || ''}`))
}

function inferProduct(text: string) {
  if (/8回券|８回券|八回券/.test(text)) return { product: '8回券', count: 8, validityDays: 90 }
  if (/4回券|４回券|四回券/.test(text)) return { product: '4回券', count: 4, validityDays: 45 }
  if (/短期集中/.test(text)) return { product: '短期集中', count: undefined, validityDays: undefined }
  if (/オンライン診断|動画診断/.test(text)) return { product: 'オンライン診断', count: undefined, validityDays: undefined }
  return { product: '', count: undefined, validityDays: undefined }
}

function compact(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 120)
}

export function analyzeCustomerHistory(sources: HistorySource[]): CustomerHistoryIntelligence {
  const sorted = [...sources]
    .filter((source) => source.body || source.ai_summary || source.occurred_at)
    .sort((a, b) => String(a.occurred_at || '').localeCompare(String(b.occurred_at || '')))

  const hints: string[] = []
  const first = sorted[0]
  const latest = sorted[sorted.length - 1]
  const allText = sorted.map((source) => `${source.body || ''}\n${source.ai_summary || ''}`).join('\n---\n')

  const inquirySource = firstByKeyword(sorted, /問い合わせ|相談|興味|お願い|診断|体験|レッスン/)
  const trialSource = firstByKeyword(sorted, /体験|スタート診断|初回体験/)
  const firstLessonSource = firstByKeyword(sorted, /初回レッスン|初回利用|初回|1回目|一回目|レッスン開始|開始|スタート|初レッスン|契約|回券/)
  const product = inferProduct(allText)

  const firstContactAt = first?.occurred_at || undefined
  const inquiryDate = inquirySource ? (parseDateFromText(`${inquirySource.body || ''}\n${inquirySource.ai_summary || ''}`, inquirySource.occurred_at) || dateOnly(inquirySource.occurred_at)) : undefined
  const trialDate = trialSource ? (parseDateFromText(`${trialSource.body || ''}\n${trialSource.ai_summary || ''}`, trialSource.occurred_at) || dateOnly(trialSource.occurred_at)) : undefined
  const firstLessonStartDate = firstLessonSource ? (parseDateFromText(`${firstLessonSource.body || ''}\n${firstLessonSource.ai_summary || ''}`, firstLessonSource.occurred_at) || dateOnly(firstLessonSource.occurred_at)) : undefined

  if (firstContactAt) hints.push(`初回接点: ${dateOnly(firstContactAt)}`)
  if (inquiryDate) hints.push(`問い合わせ日候補: ${inquiryDate}`)
  if (trialDate) hints.push(`体験日候補: ${trialDate}`)
  if (firstLessonStartDate) hints.push(`初回レッスン開始候補: ${firstLessonStartDate}`)
  if (product.product) hints.push(`契約/商品候補: ${product.product}`)

  const inferredValidUntil = firstLessonStartDate && product.validityDays ? addDays(firstLessonStartDate, product.validityDays) : undefined
  if (inferredValidUntil) hints.push(`有効期限候補: ${inferredValidUntil}`)

  const daysSince = firstLessonStartDate ? diffDays(firstLessonStartDate) : undefined
  if (typeof daysSince === 'number') hints.push(`初回から${daysSince}日経過`)

  const summaryParts = [
    firstContactAt ? `初回接点は${dateOnly(firstContactAt)}` : '',
    trialDate ? `体験候補日は${trialDate}` : '',
    firstLessonStartDate ? `初回レッスン開始候補は${firstLessonStartDate}` : '',
    typeof daysSince === 'number' ? `開始から${daysSince}日経過` : '',
    product.product ? `${product.product}${inferredValidUntil ? `、期限候補は${inferredValidUntil}` : ''}` : '',
  ].filter(Boolean)

  const fallback = sorted.slice(-2).map((source) => compact(`${source.body || source.ai_summary || ''}`)).filter(Boolean).join(' / ')

  return {
    ...(firstContactAt ? { first_contact_at: firstContactAt } : {}),
    ...(inquiryDate ? { inquiry_date: inquiryDate } : {}),
    ...(trialDate ? { trial_date: trialDate } : {}),
    ...(firstLessonStartDate ? { first_lesson_start_date: firstLessonStartDate } : {}),
    ...(typeof daysSince === 'number' ? { days_since_first_lesson: daysSince } : {}),
    ...(product.product ? { inferred_product: product.product } : {}),
    ...(product.count ? { inferred_ticket_count: product.count } : {}),
    ...(product.validityDays ? { inferred_validity_days: product.validityDays } : {}),
    ...(inferredValidUntil ? { inferred_valid_until: inferredValidUntil } : {}),
    ...(latest?.occurred_at ? { latest_contact_at: latest.occurred_at } : {}),
    summary: summaryParts.join(' / ') || fallback || '過去履歴から追加情報を推定できませんでした。',
    hints,
  }
}
