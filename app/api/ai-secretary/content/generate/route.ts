import { NextRequest, NextResponse } from 'next/server'
import { cleanText, getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'
import { CaseRecord, generateBlogDraft, generateSeoArticle, generateVideoSupport } from '@/lib/ai-secretary/case-content'

export async function POST(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })
  const body = await request.json().catch(() => null)
  const caseId = cleanText(body?.case_id, 80)
  const contentType = cleanText(body?.content_type, 40) || 'blog_draft'
  if (!caseId) return NextResponse.json({ error: 'case_id_required' }, { status: 400 })
  const { data: item, error } = await supabase.from('case_records').select('*').eq('id', caseId).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const caseRecord = item as CaseRecord
  const video = generateVideoSupport(caseRecord)
  const bodyText = contentType === 'seo_article' ? generateSeoArticle(caseRecord) : contentType === 'sns_post' ? video.sns : contentType === 'video_description' ? video.description : contentType === 'youtube_title' ? video.title : contentType === 'thumbnail_idea' ? video.thumbnail : generateBlogDraft(caseRecord)
  const title = contentType === 'seo_article' ? `SEO記事: ${caseRecord.problem || '症例記事'}` : contentType === 'case_article' ? `症例記事: ${caseRecord.problem || '症例'}` : contentType === 'sns_post' ? `SNS投稿: ${caseRecord.problem || '症例'}` : contentType === 'video_description' ? `動画説明文: ${caseRecord.problem || '症例'}` : contentType === 'youtube_title' ? `YouTubeタイトル: ${caseRecord.problem || '症例'}` : contentType === 'thumbnail_idea' ? `サムネ案: ${caseRecord.problem || '症例'}` : `ブログ下書き: ${caseRecord.problem || '症例'}`
  const { data, error: insertError } = await supabase.from('generated_contents').insert({ source_type: 'case', source_id: caseId, content_type: contentType, title, body: bodyText }).select('*').single()
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  return NextResponse.json({ status: 'ok', content: data, video_support: video })
}
