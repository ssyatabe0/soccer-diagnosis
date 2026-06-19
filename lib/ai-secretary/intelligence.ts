export function summarizeText(text: string, fallback = '内容確認が必要です。') {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (!compact) return fallback
  return compact.length > 120 ? `${compact.slice(0, 120)}...` : compact
}

export function draftReply(channel: 'line' | 'email', text: string) {
  const compact = summarizeText(text, 'お問い合わせ内容')
  const prefix = channel === 'email' ? 'お問い合わせありがとうございます。' : 'ご連絡ありがとうございます。'
  return `${prefix}\n内容確認しました。\n「${compact}」について確認して、改めてご案内いたします。\n谷田部`
}

export function nextAction(text: string) {
  const value = text.toLowerCase()
  if (text.includes('体験') || value.includes('trial')) return '体験日程を確認して候補日を返す'
  if (text.includes('予約') || text.includes('日程')) return '予約可能日時を確認する'
  if (text.includes('退会') || text.includes('休会')) return '理由と今後の関係性をメモする'
  if (text.includes('月謝') || text.includes('支払') || text.includes('料金')) return '契約・支払い状況を確認する'
  return '内容を確認して返信下書きを整える'
}

export function matchService(text: string) {
  const value = text.toLowerCase()
  if (text.includes('SYSC') || text.includes('セレクション') || value.includes('sysc')) return 'sysc'
  if (text.includes('足技') || text.includes('ドリブル')) return 'ashiwaza_dribble'
  if (text.includes('キッズ') || value.includes('kids')) return 'kids_school'
  if (text.includes('海外') || text.includes('グアム') || value.includes('guam') || value.includes('mls next')) return 'overseas'
  if (text.includes('個人') || text.includes('家庭教師') || text.includes('レッスン')) return 'private_lesson'
  return 'unknown'
}
