import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLineChannelAccessToken, pushLineTextMessage } from '@/lib/line-push'
import {
  COACH_GUIDE_ACCOUNT_KEY,
  COACH_GUIDE_PDF_URL,
  COACH_GUIDE_REPLY,
  COACH_GUIDE_REQUEST,
  COACH_GUIDE_SENT_MARKER,
  OFFICIAL_SOCCER_LINE_BASIC_ID,
} from '@/lib/coach-guide-line-reply'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('placeholder')) return null
  return createClient(url.replace(/\/+$/, ''), key)
}

function isAuthorized(request: NextRequest) {
  const token = process.env.AI_SECRETARY_READ_TOKEN
  if (!token) return false

  const header = request.headers.get('authorization') || ''
  const queryToken = new URL(request.url).searchParams.get('token') || ''
  return header === `Bearer ${token}` || queryToken === token
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'needs_review'
  const limit = Math.min(Number(searchParams.get('limit') || 50), 100)

  const { data, error } = await supabase
    .from('ai_secretary_line_inbox')
    .select('*')
    .eq('status', status)
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    status,
    count: data?.length || 0,
    items: data || [],
  })
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  const id = Number(body?.id)
  const manualMemo = String(body?.manual_memo || '').slice(0, 5000)

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('line_messages')
    .update({ manual_memo: manualMemo })
    .eq('id', id)
    .select('id, manual_memo')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ status: 'ok', item: data })
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  const id = Number(body?.id)
  const action = String(body?.action || '')
  if (!Number.isFinite(id) || id <= 0 || action !== 'send_coach_opening_guide') {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const { data: item, error: findError } = await supabase
    .from('line_messages')
    .select('id,account_key,line_user_id,body,status,manual_memo')
    .eq('id', id)
    .maybeSingle()

  if (findError || !item) {
    return NextResponse.json({ error: findError?.message || 'line_message_not_found' }, { status: 404 })
  }

  if (
    item.account_key !== COACH_GUIDE_ACCOUNT_KEY ||
    String(item.body || '').trim() !== COACH_GUIDE_REQUEST ||
    item.status !== 'needs_review'
  ) {
    return NextResponse.json({ error: 'message_not_eligible' }, { status: 409 })
  }

  if (String(item.manual_memo || '').includes(COACH_GUIDE_SENT_MARKER)) {
    return NextResponse.json({ error: 'guide_already_sent' }, { status: 409 })
  }

  const lineToken = getLineChannelAccessToken(COACH_GUIDE_ACCOUNT_KEY)
  if (!lineToken) {
    return NextResponse.json({ error: 'line_token_missing' }, { status: 500 })
  }

  const botResponse = await fetch('https://api.line.me/v2/bot/info', {
    headers: { Authorization: `Bearer ${lineToken}` },
    cache: 'no-store',
  }).catch(() => null)
  const bot = botResponse?.ok
    ? await botResponse.json().catch(() => null) as { basicId?: string; displayName?: string } | null
    : null

  if (!botResponse?.ok || bot?.basicId !== OFFICIAL_SOCCER_LINE_BASIC_ID) {
    return NextResponse.json({
      error: 'official_line_account_mismatch',
      line_status: botResponse?.status || null,
    }, { status: 502 })
  }

  const push = await pushLineTextMessage(COACH_GUIDE_ACCOUNT_KEY, item.line_user_id, COACH_GUIDE_REPLY)
  if (!push.ok) {
    return NextResponse.json({
      error: 'line_push_failed',
      line_status: push.status || null,
    }, { status: 502 })
  }

  const sentAt = new Date().toISOString()
  const memo = [
    String(item.manual_memo || '').trim(),
    `${COACH_GUIDE_SENT_MARKER}: ${sentAt}`,
    '公式LINEからサッカー個人指導コーチ開業ガイドPDF送付済み',
  ].filter(Boolean).join('\n').slice(0, 5000)

  const { error: updateError } = await supabase
    .from('line_messages')
    .update({ status: 'handled', manual_memo: memo })
    .eq('id', id)
    .eq('status', 'needs_review')

  if (updateError) {
    return NextResponse.json({ error: 'sent_but_record_failed' }, { status: 502 })
  }

  return NextResponse.json({
    status: 'sent',
    id,
    account_key: COACH_GUIDE_ACCOUNT_KEY,
    bot_basic_id: bot.basicId,
    bot_display_name: bot.displayName || null,
    pdf_url: COACH_GUIDE_PDF_URL,
    sent_at: sentAt,
  })
}
