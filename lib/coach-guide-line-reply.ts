export const COACH_GUIDE_ACCOUNT_KEY = 'soccer_private_lesson'
export const COACH_GUIDE_REQUEST = '【無料ガイド希望】サッカー個人指導コーチ開業ガイドを希望します'
export const COACH_GUIDE_PDF_URL = 'https://soccer-kateikyousi.com/wp-content/uploads/2026/08/soccer-private-coach-opening-guide.pdf'
export const COACH_GUIDE_SENT_MARKER = 'coach_opening_guide_sent'
export const OFFICIAL_SOCCER_LINE_BASIC_ID = '@gnf9264z'

export const COACH_GUIDE_REPLY = [
  '無料ガイドへのご登録ありがとうございます。',
  '',
  'こちらからPDFを受け取れます。',
  '',
  '▼サッカー個人指導コーチ開業ガイド',
  COACH_GUIDE_PDF_URL,
  '',
  'このガイドでは、個人指導コーチの仕事内容、必要な準備、60分レッスン、料金、最初のお客様、保護者対応、カルテまでをまとめています。',
  '',
  '収入や案件を保証する内容ではありません。まず、自分に合う働き方かを確認するためにご利用ください。',
].join('\n')

export function isCoachGuideRequest(accountKey: string, text: string) {
  return accountKey === COACH_GUIDE_ACCOUNT_KEY && text.trim() === COACH_GUIDE_REQUEST
}
