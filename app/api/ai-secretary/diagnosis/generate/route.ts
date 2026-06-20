import { NextRequest, NextResponse } from 'next/server'
import { cleanText, getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'
import { ProductOption, generateDiagnosisText, scoreCases, serviceLabel } from '@/lib/ai-secretary/diagnosis-center'

type SourceType = 'line' | 'gmail' | 'form' | 'video' | 'parent_consultation' | 'manual'

export async function POST(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })

  const body = await request.json().catch(() => null)
  const sourceType = (cleanText(body?.source_type, 40) || 'manual') as SourceType
  const sourceId = cleanText(body?.source_id, 120)
  let sourceText = cleanText(body?.source_text, 10000) || ''
  let customerId = cleanText(body?.customer_id, 80)

  if (sourceType === 'line' && sourceId && !sourceText) {
    const { data } = await supabase.from('ai_secretary_line_inbox').select('*').eq('id', Number(sourceId)).maybeSingle()
    sourceText = [data?.body, data?.ai_summary].filter(Boolean).join('\n')
    customerId = customerId || data?.customer_id || null
  }
  if (sourceType === 'gmail' && sourceId && !sourceText) {
    const { data } = await supabase.from('gmail_sync_sources').select('*').eq('id', Number(sourceId)).maybeSingle()
    sourceText = [data?.subject, data?.snippet, data?.ai_summary].filter(Boolean).join('\n')
    customerId = customerId || data?.customer_id || null
  }

  if (!sourceText.trim()) return NextResponse.json({ error: 'source_text_required' }, { status: 400 })

  const [{ data: customer }, { data: products }, { data: cases }, { data: videos }] = await Promise.all([
    customerId ? supabase.from('customers').select('id,full_name,parent_name,child_name,service_type').eq('id', customerId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from('products').select('id,name,service_type,product_type,ticket_count,price,monthly_fee,notes').eq('is_active', true),
    supabase.from('ai_secretary_case_assets').select('id,case_code,child_name,full_name,problem,cause,improvement,result,tags').limit(300),
    supabase.from('case_videos').select('id,title,description,sns_caption,case_id').limit(300),
  ])

  const caseMatches = scoreCases(sourceText, cases || [])
  const productOptions = (products || []) as ProductOption[]
  const diagnosis = generateDiagnosisText({ text: sourceText, sourceType, sourceId, customerName: customer?.full_name || customer?.parent_name || customer?.child_name, customerServiceType: customer?.service_type }, caseMatches, productOptions)
  const relatedVideos = (videos || []).filter((video) => caseMatches.some((item) => item.id === video.case_id)).slice(0, 5)

  const { data: diagnosisRow, error: diagnosisError } = await supabase.from('ai_diagnoses').insert({
    customer_id: customerId,
    source_type: sourceType,
    source_id: sourceId,
    source_text: sourceText,
    concern_type: diagnosis.concern,
    cause_candidates: diagnosis.causes,
    improvement_priorities: diagnosis.priorities,
    similar_case_ids: caseMatches.map((item) => item.id),
    related_video_ids: relatedVideos.map((item) => item.id),
    recommended_service: diagnosis.recommendedService,
    recommended_plan: diagnosis.recommendedPlan?.name || null,
    next_step: diagnosis.nextStep,
    ai_summary: diagnosis.summary,
  }).select('*').single()
  if (diagnosisError) return NextResponse.json({ error: diagnosisError.message }, { status: 500 })

  const plan = diagnosis.recommendedPlan
  const proposalBody = diagnosis.proposal
  const { data: proposalRow, error: proposalError } = await supabase.from('ai_proposals').insert({
    diagnosis_id: diagnosisRow.id,
    customer_id: customerId,
    title: `AI提案書: ${diagnosis.concern}`,
    current_issue: diagnosis.concern,
    inferred_causes: diagnosis.causes.join('\n'),
    improvement_plan: diagnosis.priorities.join('\n'),
    similar_cases: caseMatches.map((item) => `${item.title}: ${item.problem || ''} / ${item.result || ''}`).join('\n'),
    recommended_service: serviceLabel(diagnosis.recommendedService),
    recommended_plan: plan?.name || null,
    price_note: plan?.price ? `${plan.price.toLocaleString()}円` : plan?.monthly_fee ? `月謝 ${plan.monthly_fee.toLocaleString()}円` : '料金は谷田部確認後に確定',
    next_steps: diagnosis.nextStep,
    body: proposalBody,
  }).select('*').single()
  if (proposalError) return NextResponse.json({ error: proposalError.message }, { status: 500 })

  const { data: contractCandidate } = plan ? await supabase.from('ai_contract_candidates').insert({
    diagnosis_id: diagnosisRow.id,
    proposal_id: proposalRow.id,
    customer_id: customerId,
    product_id: plan.id,
    service_type: plan.service_type,
    product_name: plan.name,
    plan_name: plan.name,
    estimated_amount: plan.price || plan.monthly_fee,
    confidence: caseMatches.length > 0 ? 'high' : 'medium',
    ai_reason: `${diagnosis.concern}に対して${plan.name}を候補化。契約・料金は未確定。`,
  }).select('*').single() : { data: null }

  return NextResponse.json({ status: 'ok', diagnosis: diagnosisRow, proposal: proposalRow, contract_candidate: contractCandidate, similar_cases: caseMatches, related_videos: relatedVideos })
}
