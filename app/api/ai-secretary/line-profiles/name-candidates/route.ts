import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { inferLineDisplayNameFromText, isSyntheticLineDisplayName } from '@/lib/ai-secretary/line-name-inference'

type LineAccountRow = {
  customer_id: string
  account_key: string
  line_user_id: string
  display_name: string | null
  first_seen_at: string | null
  last_seen_at: string | null
}

type LineMessageRow = {
  customer_id: string | null
  account_key: string | null
  line_user_id: string | null
  body: string | null
  ai_summary: string | null
  occurred_at: string | null
}

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

function isSyntheticName(value: string | null | undefined) {
  return isSyntheticLineDisplayName(value)
}

function normalizeName(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 120)
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
  const limit = Math.min(Number(searchParams.get('limit') || 120), 300)
  const onlyMissing = searchParams.get('all') !== '1'

  const { data: accounts, error: accountError } = await supabase
    .from('customer_line_accounts')
    .select('customer_id,account_key,line_user_id,display_name,first_seen_at,last_seen_at')
    .order('last_seen_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (accountError) return NextResponse.json({ error: accountError.message }, { status: 500 })

  const rows = ((accounts || []) as LineAccountRow[]).filter((row) => !onlyMissing || isSyntheticName(row.display_name))
  if (rows.length === 0) {
    return NextResponse.json({ count: 0, items: [] })
  }

  const customerIds = [...new Set(rows.map((row) => row.customer_id).filter(Boolean))]
  const { data: messages, error: messageError } = await supabase
    .from('line_messages')
    .select('customer_id,account_key,line_user_id,body,ai_summary,occurred_at')
    .in('customer_id', customerIds)
    .order('occurred_at', { ascending: false })
    .limit(Math.min(customerIds.length * 20, 3000))

  if (messageError) return NextResponse.json({ error: messageError.message }, { status: 500 })

  const latestByAccount = new Map<string, LineMessageRow>()
  for (const message of (messages || []) as LineMessageRow[]) {
    const key = `${message.account_key || ''}:${message.line_user_id || ''}`
    if (!latestByAccount.has(key)) latestByAccount.set(key, message)
  }

  const items = rows.map((row) => {
    const key = `${row.account_key}:${row.line_user_id}`
    const latest = latestByAccount.get(key)
    return {
      customer_id: row.customer_id,
      account_key: row.account_key,
      line_user_id: row.line_user_id,
      line_user_id_tail: row.line_user_id.slice(-8),
      display_name: row.display_name,
      suggested_display_name: inferLineDisplayNameFromText(latest?.body, latest?.ai_summary),
      needs_real_name: isSyntheticName(row.display_name),
      first_seen_at: row.first_seen_at,
      last_seen_at: row.last_seen_at,
      latest_message_at: latest?.occurred_at || row.last_seen_at,
      latest_message_body: latest?.body || null,
      latest_summary: latest?.ai_summary || null,
    }
  })

  return NextResponse.json({ count: items.length, items })
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
  const items = Array.isArray(body?.items) ? body.items : []
  if (items.length === 0) {
    return NextResponse.json({ error: 'items_required' }, { status: 400 })
  }

  const results: Array<{ account_key: string; line_user_id_tail: string; display_name: string; status: string }> = []
  let updated = 0

  for (const item of items.slice(0, 200)) {
    const accountKey = normalizeName(item.account_key)
    const lineUserId = normalizeName(item.line_user_id)
    const displayName = normalizeName(item.display_name)
    if (!accountKey || !lineUserId || !displayName) {
      results.push({ account_key: accountKey, line_user_id_tail: lineUserId.slice(-8), display_name: displayName, status: 'skipped_invalid' })
      continue
    }

    const { error } = await supabase
      .from('customer_line_accounts')
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq('account_key', accountKey)
      .eq('line_user_id', lineUserId)

    if (error) {
      results.push({ account_key: accountKey, line_user_id_tail: lineUserId.slice(-8), display_name: displayName, status: `failed: ${error.message}` })
      continue
    }

    updated += 1
    results.push({ account_key: accountKey, line_user_id_tail: lineUserId.slice(-8), display_name: displayName, status: 'updated' })
  }

  return NextResponse.json({ updated, results })
}
