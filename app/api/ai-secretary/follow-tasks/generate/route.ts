import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'

export async function POST(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })

  const { data: candidates, error } = await supabase.from('ai_secretary_sales_candidates').select('*').limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const inserted = []
  for (const candidate of candidates || []) {
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
