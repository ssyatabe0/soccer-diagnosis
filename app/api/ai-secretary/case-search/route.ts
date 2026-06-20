import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'
import { CaseRecord, matchesCaseQuery } from '@/lib/ai-secretary/case-content'

export async function GET(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })
  const q = new URL(request.url).searchParams.get('q') || ''
  const [{ data: cases, error: caseError }, { data: videos, error: videoError }] = await Promise.all([
    supabase.from('ai_secretary_case_assets').select('*').order('created_at', { ascending: false }).limit(300),
    supabase.from('case_videos').select('*').order('filmed_at', { ascending: false, nullsFirst: false }).limit(300),
  ])
  if (caseError || videoError) return NextResponse.json({ error: caseError?.message || videoError?.message }, { status: 500 })
  const normalized = q.trim()
  const caseItems = normalized ? ((cases || []) as CaseRecord[]).filter((item) => matchesCaseQuery(item, normalized)) : (cases || [])
  const videoItems = normalized ? (videos || []).filter((video) => [video.title, video.description, video.thumbnail_idea, video.sns_caption, video.youtube_url].filter(Boolean).join(' ').toLowerCase().includes(normalized.toLowerCase())) : (videos || [])
  return NextResponse.json({ query: q, cases: caseItems.slice(0, 50), videos: videoItems.slice(0, 50) })
}
