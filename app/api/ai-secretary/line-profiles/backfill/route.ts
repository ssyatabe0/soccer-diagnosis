import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchLineProfile, getLineChannelAccessToken } from '@/lib/line-profile'

type LineAccountRow = {
  customer_id: string
  account_key: string
  line_user_id: string
  display_name: string | null
}

const KNOWN_ACCOUNTS = [
  'soccer_private_lesson',
  'japan_kids_soccer_club',
  'sysc_team_broadcast',
  'sysc_inquiry_news',
  'dribble_school',
]

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

function tokenStatus(accountKeys: string[]) {
  const keys = [...new Set([...KNOWN_ACCOUNTS, ...accountKeys])]
  return keys.map((accountKey) => ({
    account_key: accountKey,
    token_configured: Boolean(getLineChannelAccessToken(accountKey)),
  }))
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get('limit') || 100), 500)

  const { data, error } = await supabase
    .from('customer_line_accounts')
    .select('customer_id,account_key,line_user_id,display_name')
    .order('last_seen_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data || []) as LineAccountRow[]
  const accountKeys = rows.map((row) => row.account_key)
  const token_status = tokenStatus(accountKeys)
  const items: Array<{ account_key: string; line_user_id_tail: string; before: string | null; after: string | null; status: string }> = []
  let updated = 0
  let skippedNoToken = 0
  let alreadyHadName = 0
  let failed = 0

  for (const row of rows) {
    if (row.display_name) {
      alreadyHadName += 1
      items.push({ account_key: row.account_key, line_user_id_tail: row.line_user_id.slice(-6), before: row.display_name, after: row.display_name, status: 'already_has_display_name' })
      continue
    }

    if (!getLineChannelAccessToken(row.account_key)) {
      skippedNoToken += 1
      items.push({ account_key: row.account_key, line_user_id_tail: row.line_user_id.slice(-6), before: null, after: null, status: 'missing_channel_access_token' })
      continue
    }

    const profile = await fetchLineProfile(row.account_key, row.line_user_id)
    if (!profile?.displayName) {
      failed += 1
      items.push({ account_key: row.account_key, line_user_id_tail: row.line_user_id.slice(-6), before: null, after: null, status: 'profile_fetch_failed' })
      continue
    }

    const { error: updateError } = await supabase
      .from('customer_line_accounts')
      .update({ display_name: profile.displayName, updated_at: new Date().toISOString() })
      .eq('account_key', row.account_key)
      .eq('line_user_id', row.line_user_id)

    if (updateError) {
      failed += 1
      items.push({ account_key: row.account_key, line_user_id_tail: row.line_user_id.slice(-6), before: null, after: profile.displayName, status: `update_failed: ${updateError.message}` })
      continue
    }

    updated += 1
    items.push({ account_key: row.account_key, line_user_id_tail: row.line_user_id.slice(-6), before: null, after: profile.displayName, status: 'updated' })
  }

  return NextResponse.json({
    checked: rows.length,
    updated,
    already_had_name: alreadyHadName,
    skipped_no_token: skippedNoToken,
    failed,
    token_status,
    items,
  })
}
