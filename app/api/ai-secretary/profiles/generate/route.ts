import { NextRequest, NextResponse } from 'next/server'
import { cleanText, getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'
import { summarizeText } from '@/lib/ai-secretary/intelligence'

export async function POST(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })

  const body = await request.json().catch(() => null)
  const customerId = cleanText(body?.customer_id, 80)
  if (!customerId) return NextResponse.json({ error: 'customer_id_required' }, { status: 400 })

  const [customerRes, timelineRes, lineRes, gmailRes, contractRes, salesRes] = await Promise.all([
    supabase.from('customers').select('*').eq('id', customerId).single(),
    supabase.from('customer_timeline_events').select('*').eq('customer_id', customerId).order('occurred_at', { ascending: true }).limit(200),
    supabase.from('line_messages').select('body,ai_summary,occurred_at').eq('customer_id', customerId).order('occurred_at', { ascending: true }).limit(100),
    supabase.from('gmail_sync_sources').select('subject,snippet,ai_summary,occurred_at').eq('customer_id', customerId).order('occurred_at', { ascending: true }).limit(100),
    supabase.from('ai_secretary_contracts').select('*').eq('customer_id', customerId).limit(50),
    supabase.from('ai_secretary_sales_candidates').select('*').eq('customer_id', customerId).limit(50),
  ])

  if (customerRes.error) return NextResponse.json({ error: customerRes.error.message }, { status: 500 })
  const customer = customerRes.data
  const timelineText = [...(timelineRes.data || []).map((item) => `${item.title}: ${item.body || ''}`), ...(lineRes.data || []).map((item) => item.ai_summary || item.body), ...(gmailRes.data || []).map((item) => item.ai_summary || `${item.subject || ''} ${item.snippet || ''}`)].join('\n')
  const contracts = contractRes.data || []
  const sales = salesRes.data || []
  const lower = timelineText.toLowerCase()

  const profile = {
    customer_id: customerId,
    overview: `${customer.full_name || customer.parent_name || customer.child_name || '名称未設定'} / ${customer.service_type} / ${customer.status}`,
    pain_points: summarizeText(extractAround(timelineText, ['悩', '課題', 'ドリブル', 'セレクション', '試合', '上手', '改善']), 'まだ明確な悩みは未抽出です。'),
    inquiry_reason: summarizeText(extractAround(timelineText, ['問い合わせ', '体験', '相談', '希望', '興味']), '問い合わせ理由は履歴追加後に更新します。'),
    contract_reason: contracts.length > 0 ? `${contracts.length}件の契約履歴があります。` : '契約理由は未登録です。',
    continuation_reason: lower.includes('継続') || lower.includes('更新') ? '継続・更新に関する履歴があります。' : '継続理由は未抽出です。',
    churn_reason: customer.status === 'withdrawn' || lower.includes('退会') || lower.includes('休会') ? summarizeText(extractAround(timelineText, ['退会', '休会', '辞め', '引っ越', '怪我']), '退会・休会理由の確認が必要です。') : '退会理由はありません。',
    current_relationship: relationship(customer.status, timelineText),
    reproposal_score: scoreReproposal(customer.status, sales.map((item) => item.candidate_type)),
    review_request_score: customer.status === 'continuing' || customer.status === 'enrolled' ? 'high' : lower.includes('ありがとう') || lower.includes('助か') ? 'medium' : 'unknown',
    recommended_service: recommendService(customer.service_type, sales.map((item) => item.candidate_type)),
    caution_notes: summarizeText(extractAround(timelineText, ['注意', '怪我', '不満', '難しい', '返信なし', 'キャンセル']), '特別な注意事項は未抽出です。'),
    source_summary: summarizeText(timelineText, '履歴が少ないため、LINE/Gmail/カレンダー取り込み後に精度が上がります。'),
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from('customer_ai_profiles').upsert(profile, { onConflict: 'customer_id' }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ status: 'ok', profile: data })
}

function extractAround(text: string, words: string[]) {
  const lines = text.split('\n').filter((line) => words.some((word) => line.includes(word)))
  return lines.slice(0, 6).join('\n')
}

function relationship(status: string, text: string) {
  if (status === 'continuing' || status === 'enrolled') return '関係継続中。フォローとレビュー依頼の候補です。'
  if (status === 'withdrawn') return '退会済み。関係性を確認して再提案可否を判断します。'
  if (text.includes('ありがとう') || text.includes('よろしく')) return '関係性は良好寄りです。丁寧なフォローが有効です。'
  return '関係性は履歴追加後に更新します。'
}

function scoreReproposal(status: string, types: string[]) {
  if (types.includes('private_lesson_reproposal') || types.includes('remaining_1') || types.includes('remaining_2')) return 'high'
  if (status === 'considering' || status === 'paused') return 'medium'
  if (status === 'withdrawn') return 'low'
  return 'unknown'
}

function recommendService(serviceType: string, types: string[]) {
  if (types.includes('ashiwaza_candidate')) return '足技塾'
  if (types.includes('sysc_candidate')) return 'SYSC'
  if (types.includes('kids_school_candidate')) return 'キッズスクール'
  if (types.includes('private_lesson_reproposal')) return '個人レッスン'
  if (serviceType === 'private_lesson') return '継続回数券または足技塾'
  return '履歴追加後に自動更新します。'
}
