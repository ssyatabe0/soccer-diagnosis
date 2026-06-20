export type BusinessCandidate = {
  customer_id: string
  full_name: string | null
  parent_name: string | null
  child_name: string | null
  customer_service_type: string | null
  customer_status: string | null
  contract_id: string | null
  candidate_type: string
  product_name: string | null
  remaining_count: number | null
  effective_valid_until: string | null
  expected_amount: number | null
  expected_month: string | null
  priority: string
  ai_reason: string | null
}

export function customerName(item: Pick<BusinessCandidate, 'full_name' | 'parent_name' | 'child_name'>) {
  return item.full_name || item.parent_name || item.child_name || '名称未設定'
}

export function candidateLabel(type: string) {
  const labels: Record<string, string> = {
    remaining_1: '残り1回',
    remaining_2: '残り2回',
    expiry_30: '期限30日前',
    expiry_14: '期限14日前',
    expiry_7: '期限7日前',
    unused_90: '90日未利用',
    review_request: 'レビュー依頼候補',
    ashiwaza_candidate: '足技塾候補',
    sysc_candidate: 'SYSC候補',
    kids_school_candidate: 'キッズスクール候補',
    private_lesson_reproposal: '個人レッスン再提案候補',
  }
  return labels[type] || type
}

export function serviceLabel(type: string | null) {
  const labels: Record<string, string> = {
    private_lesson: '個人レッスン',
    ashiwaza_dribble: '足技塾',
    sysc: 'SYSC',
    kids_school: 'キッズスクール',
    overseas: '海外',
    unknown: '未分類',
  }
  return labels[type || 'unknown'] || type || '未分類'
}

export function priorityRank(priority: string | null | undefined) {
  if (priority === 'high') return 3
  if (priority === 'medium') return 2
  return 1
}

export function priorityClass(priority: string | null | undefined) {
  if (priority === 'high') return 'bg-red-100 text-red-700'
  if (priority === 'low') return 'bg-gray-100 text-gray-600'
  return 'bg-yellow-100 text-yellow-700'
}

export function salesAction(type: string) {
  if (type === 'remaining_1') return '次回レッスン後に継続回数券を提案'
  if (type === 'remaining_2') return '今の成果を確認して継続提案の準備'
  if (type.startsWith('expiry_')) return '期限前に利用予定と継続意思を確認'
  if (type === 'unused_90') return '近況確認から再開提案'
  if (type === 'review_request') return '成果を確認してレビュー依頼'
  if (type === 'ashiwaza_candidate') return '個人レッスンの成果から足技塾を提案'
  if (type === 'sysc_candidate') return '競技志向・継続状況を見てSYSC案内'
  if (type === 'kids_school_candidate') return '低学年向けにキッズスクール体験を案内'
  if (type === 'private_lesson_reproposal') return '以前の悩みに沿って個人レッスン再提案'
  return '状況確認してフォロー'
}

export function expectedValue(item: BusinessCandidate) {
  if (item.expected_amount) return item.expected_amount
  if (item.candidate_type === 'remaining_1' || item.candidate_type === 'remaining_2') return 44000
  if (item.candidate_type.includes('candidate')) return 10000
  if (item.candidate_type === 'private_lesson_reproposal') return 44000
  return 0
}

export function lineDraft(item: BusinessCandidate) {
  const name = customerName(item)
  if (item.candidate_type === 'review_request') {
    return `${name}様\nいつもありがとうございます。\n最近の変化や成長を感じていただけていたら、今後の活動の励みになりますので、短い感想をいただけますと嬉しいです。\n無理のない範囲で大丈夫です。`
  }
  if (item.candidate_type === 'unused_90') {
    return `${name}様\nご無沙汰しております。\nその後サッカーの調子はいかがでしょうか。\n最近の課題や試合で気になる点があれば、今の状況に合わせて一度整理できます。`
  }
  if (item.candidate_type === 'ashiwaza_candidate') {
    return `${name}様\n個人レッスンで取り組んだ内容を継続して身につける場として、足技塾も相性が良いと思います。\nご興味あれば参加しやすい日程をご案内します。`
  }
  if (item.candidate_type === 'sysc_candidate') {
    return `${name}様\n今後さらに試合経験や競技環境を増やす選択肢として、SYSCの活動も合う可能性があります。\n必要でしたら詳細をご案内します。`
  }
  return `${name}様\nいつもありがとうございます。\n現在の状況を踏まえると「${candidateLabel(item.candidate_type)}」のタイミングです。\n次回以降の進め方について、一度ご相談できればと思います。`
}

export function emailDraft(item: BusinessCandidate) {
  return `${customerName(item)}様\n\nいつもお世話になっております。谷田部です。\n\n${salesAction(item)}のタイミングかと思い、ご連絡いたしました。\n現在の状況やご希望に合わせて、無理のない形で次のご提案をさせていただきます。\n\nよろしくお願いいたします。\n谷田部`
}

export function riskLevel(item: BusinessCandidate) {
  if (item.candidate_type === 'unused_90') return '高'
  if (item.candidate_type === 'remaining_1' || item.candidate_type.startsWith('expiry_7')) return '中'
  if (item.candidate_type === 'remaining_2' || item.candidate_type.startsWith('expiry_14')) return '中'
  return '低'
}
