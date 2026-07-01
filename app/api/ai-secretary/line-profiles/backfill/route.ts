import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fallbackLineAccountName, fetchLineProfileDiagnostic, getLineChannelAccessToken, isFallbackLineAccountName } from '@/lib/line-profile'

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

async function fetchProfileWithAnyConfiguredToken(preferredAccountKey: string, lineUserId: string) {
  const accountKeys = [...new Set([preferredAccountKey, ...KNOWN_ACCOUNTS])]
  const attempts: Array<{ account_key: string; status: number | null; reason: string }> = []

  for (const accountKey of accountKeys) {
    if (!getLineChannelAccessToken(accountKey)) {
      attempts.push({ account_key: accountKey, status: null, reason: 'missing_channel_access_token' })
      continue
    }
    const diagnostic = await fetchLineProfileDiagnostic(accountKey, lineUserId)
    attempts.push({ account_key: accountKey, status: diagnostic.status, reason: diagnostic.reason })
    if (diagnostic.profile?.displayName) {
      return { ...diagnostic, resolved_account_key: accountKey, attempts }
    }
  }

  return { profile: null, status: attempts[0]?.status || null, ok: false, reason: attempts[0]?.reason || 'profile_fetch_failed', resolved_account_key: null, attempts }
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
  const items: Array<{ account_key: string; line_user_id_tail: string; before: string | null; after: string | null; status: string; line_api_status?: number | null; resolved_account_key?: string | null; attempts?: Array<{ account_key: string; status: number | null; reason: string }> }> = []
  let updated = 0
  const skippedNoToken = 0
  let alreadyHadName = 0
  let fallbackUpdated = 0
  let failed = 0

  for (const row of rows) {
    if (row.display_name && !isFallbackLineAccountName(row.display_name)) {
      alreadyHadName += 1
      items.push({ account_key: row.account_key, line_user_id_tail: row.line_user_id.slice(-6), before: row.display_name, after: row.display_name, status: 'already_has_display_name' })
      continue
    }

    const diagnostic = await fetchProfileWithAnyConfiguredToken(row.account_key, row.line_user_id)
    const resolvedDisplayName = diagnostic.profile?.displayName || fallbackLineAccountName(row.line_user_id)
    if (!diagnostic.profile?.displayName) {
      fallbackUpdated += 1
    }

    const { error: updateError } = await supabase
      .from('customer_line_accounts')
      .update({ display_name: resolvedDisplayName, updated_at: new Date().toISOString() })
      .eq('account_key', row.account_key)
      .eq('line_user_id', row.line_user_id)

    if (updateError) {
      failed += 1
      items.push({ account_key: row.account_key, line_user_id_tail: row.line_user_id.slice(-6), before: row.display_name, after: resolvedDisplayName, status: `update_failed: ${updateError.message}`, line_api_status: diagnostic.status, resolved_account_key: diagnostic.resolved_account_key, attempts: diagnostic.attempts })
      continue
    }

    updated += 1
    items.push({ account_key: row.account_key, line_user_id_tail: row.line_user_id.slice(-6), before: row.display_name, after: resolvedDisplayName, status: diagnostic.profile?.displayName ? 'updated' : 'fallback_updated', line_api_status: diagnostic.status, resolved_account_key: diagnostic.resolved_account_key, attempts: diagnostic.attempts })
  }

  return NextResponse.json({
    checked: rows.length,
    updated,
    already_had_name: alreadyHadName,
    fallback_updated: fallbackUpdated,
    skipped_no_token: skippedNoToken,
    failed,
    token_status,
    items,
  })
}
