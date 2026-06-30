export type ExtractedCustomerProfile = {
  full_name?: string
  parent_name?: string
  child_name?: string
  grade?: string
  region?: string
  team_name?: string
  email?: string
  phone?: string
  confidence: 'high' | 'medium' | 'low'
  source_hints: string[]
}

type ExistingCustomerProfile = {
  full_name?: string | null
  parent_name?: string | null
  child_name?: string | null
  grade?: string | null
  region?: string | null
  team_name?: string | null
  email?: string | null
  phone?: string | null
}

const PREFECTURES = [
  '北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島', '茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '東京都', '神奈川', '新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜', '静岡', '愛知', '三重', '滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山', '鳥取', '島根', '岡山', '広島', '山口', '徳島', '香川', '愛媛', '高知', '福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄', 'グアム', 'Guam', 'guam', '香港', 'シンガポール', 'アメリカ', 'カナダ'
]

const STOP_WORDS = new Set([
  'サッカー', 'レッスン', '体験', '予約', '問い合わせ', 'お願いします', 'よろしく', '谷田部', '家庭教師', 'チーム', 'スクール', 'ドリブル', 'キッズ', 'SYSC', 'LINE', 'AI', '小学生', '中学生', '高校生', 'こんにちは', 'おはようございます', 'こんばんは', 'ありがとうございます', 'お世話になります', 'お世話になっております'
])

const BAD_STANDALONE_NAME_PATTERN = /(お世話|すみません|大丈夫|先生|説明会|空いて|楽しかった|どう|明日|お疲れ|とても|AI秘書|開始|予約|確認|可能|参加|遅れ|申し訳|ありがとう|ご連絡|本日|昨日|明後日|今日|レッスン|体験)/

function cleanValue(value: string | undefined | null) {
  if (!value) return ''
  return value
    .replace(/[「」『』【】\[\]()（）]/g, '')
    .replace(/^(は|が|を|の|です|でございます|:|：|、|。|\s)+/g, '')
    .replace(/(です|です。|でございます|になります|と申します|です、).*$/g, '')
    .replace(/(さん|様|さま|君|くん|ちゃん|選手)$/g, '')
    .trim()
}

function isSafeName(value: string) {
  const cleaned = cleanValue(value)
  if (cleaned.length < 2 || cleaned.length > 14) return false
  if (/\d|@|https?:\/\//i.test(cleaned)) return false
  if (STOP_WORDS.has(cleaned)) return false
  if ([...STOP_WORDS].some((word) => cleaned.includes(word) && cleaned.length <= word.length + 2)) return false
  return /[一-龥ぁ-んァ-ンーa-zA-Z]/.test(cleaned)
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    const value = cleanValue(match?.[1])
    if (value) return value
  }
  return ''
}

function extractEmail(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || ''
}

function extractPhone(text: string) {
  const match = text.match(/(?:0\d{1,4}[-ー\s]?\d{1,4}[-ー\s]?\d{3,4}|\+\d{1,3}[-ー\s]?\d{6,14})/)
  return match?.[0]?.replace(/[ー\s]/g, '-') || ''
}

function extractGrade(text: string) {
  const labeled = firstMatch(text, [
    /(?:学年|grade)\s*[：:]\s*([^\n、。,.]{1,12})/i,
    /(?:小学|小学校)\s*([1-6１-６])\s*年/,
    /(?:中学|中学校)\s*([1-3１-３])\s*年/,
    /(?:高校|高等学校)\s*([1-3１-３])\s*年/,
  ])
  if (labeled) {
    if (/^[1-6１-６]$/.test(labeled)) return `小学${labeled}年`
    if (/^[1-3１-３]$/.test(labeled)) return `中学${labeled}年`
    return labeled
  }
  return text.match(/(?:年少|年中|年長|小[1-6１-６]|小学[1-6１-６]年|中[1-3１-３]|中学[1-3１-３]年|高[1-3１-３]|高校[1-3１-３]年|U-?\d{1,2})/i)?.[0] || ''
}

function extractRegion(text: string) {
  const labeled = firstMatch(text, [
    /(?:地域|住所|在住|お住まい|住まい|都道府県|エリア)\s*[：:]\s*([^\n、。,.]{2,24})/,
    /([^\n、。,.]{2,20})(?:在住|住み)/,
  ])
  if (labeled) return labeled
  return PREFECTURES.find((prefecture) => text.includes(prefecture)) || ''
}

function extractTeam(text: string) {
  return firstMatch(text, [
    /(?:所属チーム|所属|チーム名|クラブ|team)\s*[：:]\s*([^\n、。,.]{2,32})/i,
    /([^\n、。,.]{2,32})(?:に所属|所属です|でプレー)/,
  ])
}

function extractParentName(text: string) {
  const labeled = firstMatch(text, [
    /(?:初回内容|初回メッセージ)\s*[：:]\s*([^\n、。,.\s　]{2,12})(?:さん|様|さま)/,
    /(?:保護者名|保護者氏名|保護者|親御様|親|父|母|お父様|お母様)\s*[：:]\s*([^\n、。,.\s　]{2,14})/,
    /(?:私|わたし|自分)は([^\n、。,.\s　]{2,14})(?:です|と申します)/,
    /([^\n、。,.\s　]{2,14})(?:と申します|といいます)/,
  ])
  if (isSafeName(labeled)) return labeled
  return extractStandaloneName(text)
}

function extractChildName(text: string) {
  const labeled = firstMatch(text, [
    /(?:お子様|お子さま|子ども|子供|息子|娘|選手名|選手|本人|名前)\s*(?:の名前|氏名|名)?\s*[：:]\s*([^\n、。,.\s　]{2,14})/,
    /([^\n、。,.\s　]{2,14})の(?:母|父|保護者)です/,
    /(?:息子|娘)の([^\n、。,.\s　]{2,14})(?:です|が|は)/,
  ])
  return isSafeName(labeled) ? labeled : ''
}

function extractStandaloneName(text: string) {
  const lines = text
    .split(/\n|---/)
    .map((line) => cleanValue(line))
    .filter(Boolean)
    .slice(0, 16)

  for (const line of lines) {
    if (!isSafeName(line)) continue
    if (/[？！!?、。,.]|(ます|です|ました|ください|お願い|可能|確認|予約|日程|レッスン|体験|参加|遅れ|申し訳|ありがとう|http|www|@)/.test(line)) continue
    if (BAD_STANDALONE_NAME_PATTERN.test(line)) continue
    if (!/[一-龥]/.test(line)) continue
    if (line.length >= 2 && line.length <= 8) return line
  }
  return ''
}

function chooseFullName(parentName: string, childName: string) {
  if (childName && parentName) return `${childName} / ${parentName}`
  return childName || parentName || ''
}

export function extractCustomerProfileFromTexts(texts: string[], existing: ExistingCustomerProfile = {}): ExtractedCustomerProfile {
  const text = texts.filter(Boolean).join('\n---\n')
  const source_hints: string[] = []

  const parent_name = existing.parent_name || extractParentName(text)
  const child_name = existing.child_name || extractChildName(text)
  const grade = existing.grade || extractGrade(text)
  const region = existing.region || extractRegion(text)
  const team_name = existing.team_name || extractTeam(text)
  const email = existing.email || extractEmail(text)
  const phone = existing.phone || extractPhone(text)
  const full_name = existing.full_name || chooseFullName(parent_name || '', child_name || '')

  if (!existing.parent_name && parent_name) source_hints.push(`保護者名候補: ${parent_name}`)
  if (!existing.child_name && child_name) source_hints.push(`子ども名候補: ${child_name}`)
  if (!existing.grade && grade) source_hints.push(`学年候補: ${grade}`)
  if (!existing.region && region) source_hints.push(`地域候補: ${region}`)
  if (!existing.team_name && team_name) source_hints.push(`所属候補: ${team_name}`)
  if (!existing.email && email) source_hints.push(`メール候補: ${email}`)
  if (!existing.phone && phone) source_hints.push(`電話候補: ${phone}`)

  const score = [parent_name, child_name, grade, region, team_name, email, phone].filter(Boolean).length
  const confidence = score >= 3 || (child_name && parent_name) ? 'high' : score >= 1 ? 'medium' : 'low'

  return {
    ...(full_name ? { full_name } : {}),
    ...(parent_name ? { parent_name } : {}),
    ...(child_name ? { child_name } : {}),
    ...(grade ? { grade } : {}),
    ...(region ? { region } : {}),
    ...(team_name ? { team_name } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    confidence,
    source_hints,
  }
}

export function buildCustomerProfileUpdate(profile: ExtractedCustomerProfile, existing: ExistingCustomerProfile = {}) {
  const update: Record<string, string> = {}
  for (const key of ['full_name', 'parent_name', 'child_name', 'grade', 'region', 'team_name', 'email', 'phone'] as const) {
    const value = profile[key]
    if (!existing[key] && value) update[key] = value
  }
  return update
}
