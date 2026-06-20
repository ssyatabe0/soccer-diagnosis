import { NextRequest, NextResponse } from 'next/server'
import { cleanNumber, cleanText, getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'
import { CaseRecord, summarizeCase } from '@/lib/ai-secretary/case-content'

export async function POST(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })
  const body = await request.json().catch(() => null)
  const record = {
    customer_id: cleanText(body?.customer_id, 80),
    age: cleanNumber(body?.age),
    grade: cleanText(body?.grade, 100),
    position: cleanText(body?.position, 100),
    problem: cleanText(body?.problem),
    cause: cleanText(body?.cause),
    improvement: cleanText(body?.improvement),
    result: cleanText(body?.result),
    parent_feedback: cleanText(body?.parent_feedback),
    publish_status: cleanText(body?.publish_status, 40) || 'private',
    country: cleanText(body?.country, 100),
    region: cleanText(body?.region, 100),
    tags: String(body?.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
  }
  if (!record.problem && !record.result) return NextResponse.json({ error: 'problem_or_result_required' }, { status: 400 })
  const { data, error } = await supabase.from('case_records').insert({ ...record, ai_summary: summarizeCase(record as CaseRecord) }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (record.customer_id) {
    await supabase.from('customer_timeline_events').insert({ customer_id: record.customer_id, event_type: 'memo', title: '症例カルテ作成', body: data.ai_summary, source: 'case_record', source_table: 'case_records', source_id: data.id, occurred_at: new Date().toISOString() })
  }
  return NextResponse.json({ status: 'ok', case: data })
}
