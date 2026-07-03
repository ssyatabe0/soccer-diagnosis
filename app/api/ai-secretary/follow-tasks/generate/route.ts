import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'

type SalesCandidate = {
  customer_id: string
  contract_id: string | null
  candidate_type: string
  full_name: string | null
  parent_name: string | null
  child_name: string | null
  remaining_count: number | null
  effective_valid_until: string | null
  priority: string | null
  ai_reason: string | null
}

export async function POST(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })
  const { searchParams } = new URL(request.url)
  const body = await request.json().catch(() => null)
  const includeSalesCandidates = searchParams.get('include_sales_candidates') === 'true' || body?.include_sales_candidates === true

  const { data: candidates, error } = await supabase.from('ai_secretary_sales_candidates').select('*').limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const inserted = []
  if (includeSalesCandidates) {
    for (const candidate of (candidates || []) as SalesCandidate[]) {
      const { data: existing } = await supabase
        .from('follow_tasks')
        .select('id')
        .eq('customer_id', candidate.customer_id)
        .eq('task_type', candidate.candidate_type)
        .eq('status', 'open')
        .limit(1)
      if (existing && existing.length > 0) continue

      const { data, error: insertError } = await supabase.from('follow_tasks').insert({
        customer_id: candidate.customer_id,
        contract_id: candidate.contract_id,
        task_type: candidate.candidate_type,
        title: titleFor(candidate.candidate_type),
        due_date: new Date().toISOString().slice(0, 10),
        priority: candidate.priority || 'medium',
        ai_reason: candidate.ai_reason,
        notes: 'AI売上候補から自動生成。送信はしない。',
      }).select('*').single()
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
      inserted.push(data)
    }
  }

  for (const task of buildPaceRiskTasks((candidates || []) as SalesCandidate[])) {
    const { data: existing } = await supabase
      .from('follow_tasks')
      .select('id')
      .eq('customer_id', task.customer_id)
      .eq('contract_id', task.contract_id)
      .eq('title', task.title)
      .eq('status', 'open')
      .limit(1)
    if (existing && existing.length > 0) continue

    const { data, error: insertError } = await supabase.from('follow_tasks').insert(task).select('*').single()
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    inserted.push(data)
  }

  return NextResponse.json({ status: 'ok', count: inserted.length, items: inserted })
}

function titleFor(type: string) {
  const labels: Record<string, string> = {
    remaining_1: '残り1回フォロー',
    remaining_2: '残り2回フォロー',
    expiry_30: '期限30日前フォロー',
    expiry_14: '期限14日前フォロー',
    expiry_7: '期限7日前フォロー',
    unused_90: '90日未利用フォロー',
    review_request: 'レビュー依頼',
    ashiwaza_candidate: '足技塾提案',
    sysc_candidate: 'SYSC提案',
    kids_school_candidate: 'キッズスクール提案',
    private_lesson_reproposal: '個人レッスン再提案',
  }
  return labels[type] || 'AIフォロー'
}

function dateDiffDays(dateText: string) {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const target = new Date(`${dateText.slice(0, 10)}T00:00:00.000Z`)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function customerName(candidate: SalesCandidate) {
  return candidate.full_name || candidate.parent_name || candidate.child_name || '顧客'
}

function buildPaceRiskTasks(candidates: SalesCandidate[]) {
  const tasks: Array<Record<string, string | null>> = []
  const seen = new Set<string>()

  for (const candidate of candidates) {
    if (!candidate.customer_id || !candidate.contract_id) continue
    if (typeof candidate.remaining_count !== 'number' || candidate.remaining_count <= 0) continue
    if (!candidate.effective_valid_until) continue

    const daysLeft = dateDiffDays(candidate.effective_valid_until)
    const remaining = candidate.remaining_count
    const isCritical = daysLeft <= 14 && remaining >= 2
    const isWarning = daysLeft <= 30 && remaining >= 4
    if (!isCritical && !isWarning) continue

    const key = `${candidate.customer_id}:${candidate.contract_id}:pace_risk`
    if (seen.has(key)) continue
    seen.add(key)

    const name = customerName(candidate)
    const urgency = isCritical ? 'かなり危険' : '危険'
    const title = `送らないとやばい：${name} 回数券ペース確認`
    const reason = `${name}さんは残り${remaining}回、期限まで${daysLeft}日です。このペースだと90日の期限内に全回数を消化しきれない可能性があります。谷田部確認後、日程まとめ調整LINEを送るべきです。`

    tasks.push({
      customer_id: candidate.customer_id,
      contract_id: candidate.contract_id,
      task_type: 'manual',
      title,
      due_date: new Date().toISOString().slice(0, 10),
      status: 'open',
      priority: 'high',
      ai_reason: `送らないとやばいぞ。${urgency}。${reason}`,
      notes: 'AI期限ペース判定から自動生成。自動送信はしない。必ず谷田部が確認してから送る。',
      draft_message: buildPaceRiskLineDraft(remaining, daysLeft),
    })
  }

  return tasks
}

function buildPaceRiskLineDraft(remaining: number, daysLeft: number) {
  const intro = daysLeft <= 14
    ? '現在の回数券について、残り回数に対して有効期限までの日数がかなり少なくなってきています。'
    : '現在の回数券について、残り回数に対して有効期限までの日数が少なくなってきています。'

  return [
    'いつもありがとうございます。',
    '',
    intro,
    `現在、残り${remaining}回で、有効期限まで残り約${Math.max(daysLeft, 0)}日です。`,
    'このペースのままだと、90日の期限内に全回数を消化しきれない可能性があります。',
    '',
    'できれば今週中に、残りの日程をまとめて調整できればと思います。',
    '候補日を複数いただけますでしょうか。',
    '',
    '谷田部',
  ].join('\n')
}
