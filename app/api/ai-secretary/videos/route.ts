import { NextRequest, NextResponse } from 'next/server'
import { cleanText, getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'

export async function POST(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })
  const body = await request.json().catch(() => null)
  const record = {
    customer_id: cleanText(body?.customer_id, 80),
    case_id: cleanText(body?.case_id, 80),
    filmed_at: cleanText(body?.filmed_at, 20),
    title: cleanText(body?.title, 300),
    category: cleanText(body?.category, 40) || 'lesson',
    publish_status: cleanText(body?.publish_status, 40) || 'private',
    youtube_url: cleanText(body?.youtube_url, 1000),
    short_url: cleanText(body?.short_url, 1000),
    description: cleanText(body?.description),
    thumbnail_idea: cleanText(body?.thumbnail_idea),
    sns_caption: cleanText(body?.sns_caption),
  }
  if (!record.title) return NextResponse.json({ error: 'title_required' }, { status: 400 })
  const { data, error } = await supabase.from('case_videos').insert(record).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ status: 'ok', video: data })
}
