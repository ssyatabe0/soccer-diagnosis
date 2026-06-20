import { NextRequest, NextResponse } from 'next/server'
import { cleanText, getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'

export async function POST(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })
  const body = await request.json().catch(() => null)
  const diagnosisId = cleanText(body?.diagnosis_id, 80)
  if (!diagnosisId) return NextResponse.json({ error: 'diagnosis_id_required' }, { status: 400 })

  const { data: diagnosis, error } = await supabase.from('ai_diagnoses').select('*').eq('id', diagnosisId).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const proposalBody = `# AI提案書下書き\n\n## 現在の悩み\n${diagnosis.concern_type || '-'}\n\n## 推定原因\n${(diagnosis.cause_candidates || []).map((item: string) => `- ${item}`).join('\n')}\n\n## 改善優先順位\n${(diagnosis.improvement_priorities || []).map((item: string, index: number) => `${index + 1}. ${item}`).join('\n')}\n\n## おすすめサービス\n${diagnosis.recommended_service || '-'}\n\n## おすすめプラン\n${diagnosis.recommended_plan || '-'}\n\n## 次のステップ\n${diagnosis.next_step || '谷田部確認'}\n\n※契約・料金は未確定です。`
  const { data, error: insertError } = await supabase.from('ai_proposals').insert({ diagnosis_id: diagnosisId, customer_id: diagnosis.customer_id, title: `AI提案書: ${diagnosis.concern_type || '相談'}`, current_issue: diagnosis.concern_type, inferred_causes: (diagnosis.cause_candidates || []).join('\n'), improvement_plan: (diagnosis.improvement_priorities || []).join('\n'), recommended_service: diagnosis.recommended_service, recommended_plan: diagnosis.recommended_plan, next_steps: diagnosis.next_step, body: proposalBody }).select('*').single()
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  return NextResponse.json({ status: 'ok', proposal: data })
}
