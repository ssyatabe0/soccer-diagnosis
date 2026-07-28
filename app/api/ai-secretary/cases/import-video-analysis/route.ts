import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { cleanNumber, cleanText, getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'
import { CaseRecord, summarizeCase } from '@/lib/ai-secretary/case-content'

const allowedStatuses = new Set(['private', 'permission_needed', 'public_allowed', 'published'])

function tags(value: unknown) {
  const input = Array.isArray(value) ? value : String(value || '').split(',')
  return [...new Set(input.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 50)
}

function stableCode(sourceProject: string, sourceId: string) {
  const digest = createHash('sha256').update(`${sourceProject}:${sourceId}`).digest('hex').slice(0, 12).toUpperCase()
  return `VIDEO-${digest}`
}

function youtubeUrl(value: unknown) {
  const url = cleanText(value, 500)
  return url && /^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//.test(url) ? url : null
}

export function GET() {
  return NextResponse.json({
    endpoint: '/api/ai-secretary/cases/import-video-analysis',
    authentication: 'Authorization: Bearer <AI_SECRETARY_READ_TOKEN>',
    idempotency: 'source_project + source_idから固定case_codeを生成し、再送時は更新します。',
    publication_policy: '既定はpermission_needed。publication_consent=trueかつanonymized_verified=trueの場合だけpublishedを受け付けます。',
    required: ['source_id', 'problem または result'],
    accepted: [
      'source_project', 'source_id', 'customer_id', 'age', 'grade', 'position',
      'problem', 'cause', 'improvement', 'result', 'parent_feedback', 'country',
      'region', 'tags', 'youtube_url', 'filmed_at', 'publish_status',
      'publication_consent', 'anonymized_verified',
    ],
  })
}

export async function POST(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })
  const body = await request.json().catch(() => null)
  const sourceProject = cleanText(body?.source_project, 100) || 'yatabe-coaching-analytics'
  const sourceId = cleanText(body?.source_id, 200)
  if (!sourceId) return NextResponse.json({ error: 'source_id_required' }, { status: 400 })

  const requestedStatus = cleanText(body?.publish_status, 40) || 'permission_needed'
  const canPublish = body?.publication_consent === true && body?.anonymized_verified === true
  const publishStatus = requestedStatus === 'published' && !canPublish
    ? 'permission_needed'
    : (allowedStatuses.has(requestedStatus) ? requestedStatus : 'permission_needed')
  const sourceTags = tags(body?.tags)
  const record = {
    case_code: stableCode(sourceProject, sourceId),
    customer_id: cleanText(body?.customer_id, 80),
    age: cleanNumber(body?.age),
    grade: cleanText(body?.grade, 100),
    position: cleanText(body?.position, 100),
    problem: cleanText(body?.problem),
    cause: cleanText(body?.cause),
    improvement: cleanText(body?.improvement),
    result: cleanText(body?.result),
    parent_feedback: cleanText(body?.parent_feedback),
    publish_status: publishStatus,
    country: cleanText(body?.country, 100),
    region: cleanText(body?.region, 100),
    tags: [...new Set([...sourceTags, `source:${sourceProject}`, `source-id:${sourceId}`])],
    updated_at: new Date().toISOString(),
  }
  if (!record.problem && !record.result) return NextResponse.json({ error: 'problem_or_result_required' }, { status: 400 })

  const { data, error } = await supabase
    .from('case_records')
    .upsert({ ...record, ai_summary: summarizeCase(record as CaseRecord) }, { onConflict: 'case_code' })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const video = youtubeUrl(body?.youtube_url)
  if (video) {
    const videoCode = `VID-${createHash('sha256').update(`${record.case_code}:${video}`).digest('hex').slice(0, 12).toUpperCase()}`
    await supabase.from('case_videos').upsert({
      video_code: videoCode,
      customer_id: record.customer_id,
      case_id: data.id,
      filmed_at: cleanText(body?.filmed_at, 10),
      title: cleanText(body?.title, 200) || record.problem || record.case_code,
      category: 'case',
      publish_status: publishStatus === 'published' ? 'published' : 'permission_needed',
      youtube_url: video,
      description: record.result,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'video_code' })
  }

  return NextResponse.json({
    status: 'ok',
    mode: data.created_at === data.updated_at ? 'created' : 'updated',
    source_id: sourceId,
    case_code: record.case_code,
    publish_status: publishStatus,
    public_ready: publishStatus === 'published',
    case: data,
  })
}
