import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

type SearchParams = Record<string, string | string[] | undefined>

type CustomerRow = {
  id: string
  full_name: string | null
  parent_name: string | null
  child_name: string | null
  email: string | null
  phone: string | null
  service_type: string
  status: string
  grade: string | null
  region: string | null
  team_name: string | null
  inquiry_date: string | null
  trial_date: string | null
  enrolled_date: string | null
  withdrawn_date: string | null
  owner_name: string | null
  next_reservation_at: string | null
  memo: string | null
  last_contact_at: string | null
  line_message_count: number | null
  line_account_names: string[] | null
  line_display_names?: string[]
}

type CustomerLineAccountRow = {
  customer_id: string
  display_name: string | null
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('placeholder')) return null
  return createClient(url.replace(/\/+$/, ''), key)
}

function valueOf(value: string | string[] | undefined, fallback = '') {
  if (Array.isArray(value)) return value[0] || fallback
  return value || fallback
}

async function getSearchParams(input: Promise<SearchParams> | SearchParams | undefined) {
  return input ? await Promise.resolve(input) : {}
}

async function loadCustomers(status: string, serviceType: string, keyword: string) {
  const supabase = getServiceClient()
  if (!supabase) return { items: [] as CustomerRow[], error: 'supabase_not_configured' }

  let query = supabase
    .from('ai_secretary_customers')
    .select('*')
    .order('last_contact_at', { ascending: false, nullsFirst: false })
    .limit(200)

  if (status) query = query.eq('status', status)
  if (serviceType) query = query.eq('service_type', serviceType)

  const { data, error } = await query
  if (error) return { items: [] as CustomerRow[], error: error.message }
  const rows = (data || []) as CustomerRow[]
  const ids = rows.map((customer) => customer.id)
  const lineDisplayNames = new Map<string, string[]>()
  if (ids.length > 0) {
    const { data: lineAccounts } = await supabase
      .from('customer_line_accounts')
      .select('customer_id,display_name')
      .in('customer_id', ids)
    for (const account of (lineAccounts || []) as CustomerLineAccountRow[]) {
      if (!account.display_name) continue
      const values = lineDisplayNames.get(account.customer_id) || []
      values.push(account.display_name)
      lineDisplayNames.set(account.customer_id, [...new Set(values)])
    }
  }
  const enrichedRows = rows.map((customer) => ({
    ...customer,
    line_display_names: lineDisplayNames.get(customer.id) || [],
  }))
  const normalized = keyword.trim().toLowerCase()
  const items = enrichedRows.filter((customer) => {
    if (!normalized) return true
    return [
      customer.full_name,
      customer.parent_name,
      customer.child_name,
      customer.email,
      customer.phone,
      customer.grade,
      customer.region,
      customer.team_name,
      customer.next_reservation_at,
      customer.memo,
      ...(customer.line_display_names || []),
      ...(customer.line_account_names || []),
    ].filter(Boolean).join(' ').toLowerCase().includes(normalized)
  })
  return { items, error: null }
}

function serviceLabel(value: string) {
  if (value === 'private_lesson') return '個人レッスン'
  if (value === 'ashiwaza_dribble') return '足技塾/ドリブル塾'
  if (value === 'sysc') return 'SYSC'
  if (value === 'kids_school') return 'キッズスクール'
  if (value === 'overseas') return '海外問い合わせ'
  return '未分類'
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    new_inquiry: '新規問い合わせ',
    trial_scheduling: '体験調整中',
    trial_booked: '体験予約済み',
    trial_done: '体験完了',
    considering: '検討中',
    enrolled: '入会',
    continuing: '継続',
    paused: '休会',
    withdrawn: '退会',
  }
  return labels[value] || value
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function formatDateOnly(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
}

function daysSince(value: string | null) {
  if (!value) return null
  const start = new Date(`${value.slice(0, 10)}T00:00:00+09:00`).getTime()
  const today = new Date(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) + 'T00:00:00+09:00').getTime()
  return Math.max(0, Math.floor((today - start) / 86400000))
}

function aiMemoLine(memo: string | null) {
  if (!memo) return ''
  const line = memo.split('\n').find((item) => item.startsWith('AI履歴要約:')) || memo.split('\n').find((item) => item.startsWith('AI履歴整理:'))
  return line ? line.replace(/^AI履歴要約:\\s*/, '').replace(/^AI履歴整理:\\s*/, '') : ''
}

function displayName(customer: CustomerRow) {
  const lineName = customer.line_display_names?.[0]
  return customer.full_name || customer.child_name || customer.parent_name || lineName || 'LINE表示名取得待ち'
}

function needsNameConfirmation(customer: CustomerRow) {
  return !customer.full_name && !customer.parent_name && !customer.child_name
}

export default async function AiSecretaryCustomersPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const params = await getSearchParams(searchParams)
  const token = valueOf(params.token)
  const status = valueOf(params.status)
  const serviceType = valueOf(params.service_type)
  const keyword = valueOf(params.q)
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN

  if (!requiredToken || token !== requiredToken) {
    return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>
  }

  const { items, error } = await loadCustomers(status, serviceType, keyword)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold text-green-700">Yatabe AI Secretary Phase2</p>
          <h2 className="text-2xl font-black text-gray-900">顧客マスタ</h2>
          <p className="mt-1 text-sm text-gray-500">LINE受信から自動作成された顧客を管理します。送信はしません。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/ai-secretary/dashboard?token=${encodeURIComponent(token)}`} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700">今日の対応へ</Link>
          <Link href={`/admin/ai-secretary/line-inbox?token=${encodeURIComponent(token)}`} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700">LINE未対応へ</Link>
        </div>
      </div>

      <form className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto_auto]">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="status" value={status} />
        <input name="q" defaultValue={keyword} placeholder="氏名・保護者・子ども・メール・電話・地域・所属チームで検索" className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
        <select name="service_type" defaultValue={serviceType} className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100">
          <option value="">全サービス</option>
          <option value="private_lesson">個人レッスン</option>
          <option value="ashiwaza_dribble">足技塾</option>
          <option value="sysc">SYSC</option>
          <option value="kids_school">キッズスクール</option>
          <option value="overseas">海外</option>
          <option value="unknown">未分類</option>
        </select>
        <button className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white">検索</button>
      </form>

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        {[['', '全件'], ['new_inquiry', '新規'], ['trial_scheduling', '体験調整'], ['enrolled', '入会'], ['continuing', '継続'], ['withdrawn', '退会']].map(([key, label]) => (
          <Link key={key} href={`/admin/ai-secretary/customers?token=${encodeURIComponent(token)}&status=${key}&service_type=${serviceType}&q=${encodeURIComponent(keyword)}`} className={`rounded-full px-3 py-2 ${status === key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200'}`}>{label}</Link>
        ))}
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Supabase読み取りエラー: {error}</div>}

      <div className="grid gap-3">
        {items.map((customer) => (
          <Link key={customer.id} href={`/admin/ai-secretary/customers/${customer.id}?token=${encodeURIComponent(token)}`} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-green-300 hover:shadow-md">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{serviceLabel(customer.service_type)}</span>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{statusLabel(customer.status)}</span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">LINE {customer.line_message_count || 0}件</span>
                </div>
                <h3 className="mt-3 text-lg font-black text-gray-900">{displayName(customer)}</h3>
                {needsNameConfirmation(customer) && <p className="mt-1 text-xs font-bold text-gray-500">相手のLINE表示名を取得できたらここに出します。保護者名・選手名は必要な時だけ追記。</p>}
                {(customer.line_display_names || []).length > 0 && <p className="mt-1 text-xs font-bold text-gray-500">LINE表示名: {(customer.line_display_names || []).join(' / ')}</p>}
                <p className="mt-1 text-sm text-gray-500">保護者: {customer.parent_name || '-'} / 子ども: {customer.child_name || '-'} / 学年: {customer.grade || '-'}</p>
                <p className="mt-1 text-sm text-gray-500">地域: {customer.region || '-'} / 所属: {customer.team_name || '-'}</p>
                <p className="mt-1 text-sm text-gray-500">メール: {customer.email || '-'} / 電話: {customer.phone || '-'}</p>
                <p className="mt-2 text-sm font-bold text-gray-700">
                  問い合わせ: {formatDateOnly(customer.inquiry_date)} / 体験: {formatDateOnly(customer.trial_date)} / 初回開始候補: {formatDateOnly(customer.enrolled_date)}
                  {daysSince(customer.enrolled_date) !== null ? `（${daysSince(customer.enrolled_date)}日経過）` : ''}
                </p>
                {aiMemoLine(customer.memo) && <p className="mt-2 rounded-xl bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-600">AI履歴: {aiMemoLine(customer.memo)}</p>}
              </div>
              <div className="text-left text-xs text-gray-500 md:text-right">
                <div>最終連絡: {formatDate(customer.last_contact_at)}</div>
                <div className="mt-1">次回予約: {formatDate(customer.next_reservation_at)}</div>
                <div className="mt-1">LINE公式: {(customer.line_account_names || []).join(', ') || '-'}</div>
              </div>
            </div>
          </Link>
        ))}

        {items.length === 0 && !error && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="font-bold text-gray-800">顧客マスタはまだありません。</p>
            <p className="mt-2 text-sm text-gray-500">新しいLINEが届くと自動作成されます。</p>
          </div>
        )}
      </div>
    </div>
  )
}
