const INTERNAL_NAMES = new Set(['谷田部', '野間'])

const KNOWN_SURNAME_HINTS = [
  '高平',
  '今野',
  '芝山',
  '小林',
  '根本',
  '平山',
  '豊島',
  '櫻庭',
  '桜庭',
  '望月',
  '大塚',
  '伊藤',
  '植木',
  '長島',
  '上條',
  '上条',
  '熊谷',
  '松田',
  '青山',
]

const BAD_CONTEXT = /(株式会社|営業|無料|資料|AI検索|Googleマップ|レポート|希望|サッカー家庭教師様)/
const BAD_NAME_PHRASES = new Set([
  'できます',
  'できました',
  'できましたら',
  'いたします',
  '致します',
  'お願いします',
  'お願いいたします',
  'よろしくお願いします',
  'よろしくお願いいたします',
  '承知しました',
  '承知いたしました',
  '了解しました',
  '了解いたしました',
  'わかりました',
  '分かりました',
  'ありがとう',
  'ありがとうございます',
  'ございます',
  'ここですね',
  'ご報告まで',
])

function cleanCandidate(value: string) {
  return value.replace(/[「」『』【】\[\]()（）:：、。,.]/g, '').trim()
}

function isUsableName(value: string) {
  const name = cleanCandidate(value)
  if (name.length < 2 || name.length > 8) return false
  if (INTERNAL_NAMES.has(name)) return false
  if (BAD_NAME_PHRASES.has(name)) return false
  if (!/^[一-龥ぁ-んァ-ンー]+$/.test(name)) return false
  if (/(先生|さん|様|さま|くん|ちゃん|お世話|お願い|ありがとう|よろしく|確認|今日|明日|昨日|予定|中止|参加|連絡|到着|可能|体調|遠征|合宿|承知|了解|報告|できました|わかりました|分かりました|ここ|ですね)/.test(name)) return false
  return true
}

export function inferLineDisplayNameFromText(...texts: Array<string | null | undefined>) {
  const text = texts.filter(Boolean).join('\n')
  if (!text || BAD_CONTEXT.test(text)) return ''

  for (const surname of KNOWN_SURNAME_HINTS) {
    if (text.includes(surname)) return surname
  }

  const signatureLines = text
    .split(/\n/)
    .map((line) => cleanCandidate(line))
    .filter(Boolean)
    .slice(-6)

  for (const line of signatureLines) {
    if (isUsableName(line)) return line
  }

  const signed = text.match(/(?:よろしくお願いします|お願いいたします|失礼いたします)[\s\S]{0,20}\n([一-龥ぁ-んァ-ンー]{2,8})\s*$/)
  const signedName = cleanCandidate(signed?.[1] || '')
  if (isUsableName(signedName)) return signedName

  return ''
}

export function isSyntheticLineDisplayName(value: string | null | undefined) {
  if (!value) return true
  return /^LINEアカウント-[a-zA-Z0-9_-]{4,}$/.test(value) || /^\d{4}\/\d{2}\/\d{2}のLINE相談$/.test(value)
}
