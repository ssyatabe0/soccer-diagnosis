import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { analyzeCustomerHistory } from '@/lib/ai-secretary/customer-history-analyzer'
import { buildCustomerProfileUpdate, extractCustomerProfileFromTexts } from '@/lib/ai-secretary/customer-profile-extractor'

type CustomerRow = {
  id: string
  full_name: string | null
  parent_name: string | null
  child_name: string | null
  grade: string | null
  region: string | null
  team_name: string | null
  email: string | null
  phone: string | null
  inquiry_date: string | null
  trial_date: string | null
  enrolled_date: string | null
  first_contact_at: string | null
  last_contact_at: string | null
  memo: string | null
}

type LineRow = {
  customer_id: string | null
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

function needsProfile(customer: CustomerRow) {
  return !customer.full_name || !customer.parent_name || !customer.child_name || !customer.grade || !customer.region || !customer.team_name || !customer.email || !customer.phone || !customer.first_contact_at || !customer.inquiry_date || !customer.trial_date || !customer.enrolled_date
}

function isBadAutoName(value: string | null | undefined) {
  if (!value) return false
  return /^(お世話|すみません|すみません、|大丈夫|先生|説明会|空いてそう|お疲れ|どう|とても楽しかった|明日雨になりそう|AI秘書接続テスト)$/.test(value)
    || /(空いて|楽しかった|明日|お疲れ|説明会|AI秘書|すみません|お世話)/.test(value)
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
  const limit = Math.min(Number(searchParams.get('limit') || 200), 500)

  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('id,full_name,parent_name,child_name,grade,region,team_name,email,phone,inquiry_date,trial_date,enrolled_date,first_contact_at,last_contact_at,memo')
    .order('last_contact_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (customerError) {
    return NextResponse.json({ error: customerError.message }, { status: 500 })
  }

  const targetCustomers = ((customers || []) as CustomerRow[]).filter(needsProfile)
  if (targetCustomers.length === 0) {
    return NextResponse.json({ checked: customers?.length || 0, updated: 0, items: [] })
  }

  const customerIds = targetCustomers.map((customer) => customer.id)
  const { data: lineRows, error: lineError } = await supabase
    .from('line_messages')
    .select('customer_id,body,ai_summary,occurred_at')
    .in('customer_id', customerIds)
    .order('occurred_at', { ascending: false })
    .limit(Math.min(customerIds.length * 30, 3000))

  if (lineError) {
    return NextResponse.json({ error: lineError.message }, { status: 500 })
  }

  const grouped = new Map<string, string[]>()
  for (const row of (lineRows || []) as LineRow[]) {
    if (!row.customer_id) continue
    const items = grouped.get(row.customer_id) || []
    if (row.body) items.push(row.body)
    if (row.ai_summary) items.push(row.ai_summary)
    grouped.set(row.customer_id, items.slice(0, 40))
  }

  const updatedItems: Array<{ id: string; update: Record<string, string>; hints: string[] }> = []

  for (const customer of targetCustomers) {
    const texts = [customer.memo || '', ...(grouped.get(customer.id) || [])].filter(Boolean)
    if (texts.length === 0) continue
    const cleanedCustomer = {
      ...customer,
      full_name: isBadAutoName(customer.full_name) ? null : customer.full_name,
      parent_name: isBadAutoName(customer.parent_name) ? null : customer.parent_name,
    }
    const cleanupUpdate: Record<string, string | null> = {
      ...(isBadAutoName(customer.full_name) ? { full_name: null } : {}),
      ...(isBadAutoName(customer.parent_name) ? { parent_name: null } : {}),
    }
    const profile = extractCustomerProfileFromTexts(texts, cleanedCustomer)
    const historySources = [
      ...(customer.memo ? [{ body: customer.memo, occurred_at: customer.first_contact_at || customer.last_contact_at, source: 'memo' as const }] : []),
      ...((lineRows || []) as LineRow[])
      .filter((row) => row.customer_id === customer.id)
      .map((row) => ({ body: row.body, ai_summary: row.ai_summary, occurred_at: row.occurred_at, source: 'line' as const })),
    ]
    const history = analyzeCustomerHistory(historySources)
    const update: Record<string, string | null> = {
      ...cleanupUpdate,
      ...buildCustomerProfileUpdate(profile, cleanedCustomer),
      ...(!customer.first_contact_at && history.first_contact_at ? { first_contact_at: history.first_contact_at } : {}),
      ...(!customer.inquiry_date && history.inquiry_date ? { inquiry_date: history.inquiry_date } : {}),
      ...(!customer.trial_date && history.trial_date ? { trial_date: history.trial_date } : {}),
      ...(!customer.enrolled_date && history.first_lesson_start_date ? { enrolled_date: history.first_lesson_start_date } : {}),
      ...(history.latest_contact_at ? { last_contact_at: history.latest_contact_at } : {}),
    }
    if (Object.keys(update).length === 0) continue

    const memo = [
      customer.memo || '',
      profile.source_hints.length > 0 ? `AI過去履歴推定: ${profile.source_hints.join(' / ')}` : '',
      history.hints.length > 0 ? `AI履歴整理: ${history.hints.join(' / ')}` : '',
      `AI履歴要約: ${history.summary}`,
    ].filter(Boolean).join('\n').slice(0, 2000)

    const { error: updateError } = await supabase
      .from('customers')
      .update({ ...update, memo, updated_at: new Date().toISOString() })
      .eq('id', customer.id)

    if (!updateError) {
      updatedItems.push({ id: customer.id, update, hints: profile.source_hints })
    }
  }

  return NextResponse.json({
    checked: customers?.length || 0,
    target_count: targetCustomers.length,
    updated: updatedItems.length,
    items: updatedItems,
  })
}
