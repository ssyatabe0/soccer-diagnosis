import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { CustomerEditor } from '@/components/ai-secretary/CustomerEditor'

type SearchParams = Record<string, string | string[] | undefined>

type Customer = {
  id: string
  full_name: string | null
  parent_name: string | null
  child_name: string | null
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
  memo: string | null
  first_contact_at: string | null
  last_contact_at: string | null
}

type TimelineEvent = {
  id: number
  event_type: string
  title: string
  body: string | null
  source: string
  account_key: string | null
  occurred_at: string
}

type LineMessage = {
  id: number
  account_display_name: string | null
  body: string
  ai_summary: string | null
  ai_reply_draft: string | null
  intent: string | null
  occurred_at: string
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

async function loadCustomer(id: string) {
  const supabase = getServiceClient()
  if (!supabase) return { customer: null, timeline: [] as TimelineEvent[], lines: [] as LineMessage[], error: 'supabase_not_configured' }

  const [{ data: customer, error: customerError }, { data: timeline, error: timelineError }, { data: lines, error: linesError }] = await Promise.all([
    supabase.from('customers').select('*').eq('id', id).single(),
    supabase.from('customer_timeline_events').select('*').eq('customer_id', id).order('occurred_at', { ascending: false }).limit(100),
    supabase.from('ai_secretary_line_inbox').select('*').eq('customer_id', id).order('occurred_at', { ascending: false }).limit(100),
  ])

  const error = customerError?.message || timelineError?.message || linesError?.message || null
  return { customer: customer as Customer | null, timeline: (timeline || []) as TimelineEvent[], lines: (lines || []) as LineMessage[], error }
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    inquiry: '問い合わせ',
    line_message: 'LINE',
    trial: '体験',
    enrollment: '入会',
    withdrawal: '退会',
    memo: 'メモ',
    gmail: 'Gmail',
    calendar: 'カレンダー',
  }
  return labels[type] || type
}

export default async function AiSecretaryCustomerDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<SearchParams> | SearchParams }) {
  const [{ id }, query] = await Promise.all([params, getSearchParams(searchParams)])
  const token = valueOf(query.token)
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN

  if (!requiredToken || token !== requiredToken) {
    return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>
  }

  const { customer, timeline, lines, error } = await loadCustomer(id)

  if (error || !customer) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">顧客読み取りエラー: {error || 'not_found'}</div>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold text-green-700">Yatabe AI Secretary Phase2</p>
          <h2 className="text-2xl font-black text-gray-900">顧客詳細</h2>
          <p className="mt-1 text-sm text-gray-500">顧客マスタ、LINE履歴、問い合わせタイムラインを確認します。</p>
        </div>
        <Link href={`/admin/ai-secretary/customers?token=${encodeURIComponent(token)}`} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700">顧客一覧へ</Link>
      </div>

      <CustomerEditor customer={customer} token={token} />

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">顧客タイムライン</h3>
        <div className="mt-4 space-y-3">
          {timeline.map((event) => (
            <div key={event.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">{eventLabel(event.event_type)}</span>
                <span className="text-xs font-bold text-gray-500">{formatDate(event.occurred_at)}</span>
                {event.account_key && <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">{event.account_key}</span>}
              </div>
              <div className="mt-2 font-bold text-gray-900">{event.title}</div>
              {event.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700">{event.body}</p>}
            </div>
          ))}
          {timeline.length === 0 && <p className="text-sm text-gray-500">タイムラインはまだありません。</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">LINE履歴</h3>
        <div className="mt-4 space-y-3">
          {lines.map((line) => (
            <div key={line.id} className="rounded-xl border border-gray-100 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500">
                <span>{formatDate(line.occurred_at)}</span>
                <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">{line.account_display_name || 'LINE'}</span>
                <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">{line.intent || 'line_message'}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm leading-7 text-gray-800">{line.body}</p>
              {line.ai_summary && <p className="mt-2 rounded-lg bg-green-50 p-3 text-sm leading-7 text-green-900">AI要約: {line.ai_summary}</p>}
              {line.ai_reply_draft && <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-gray-100 p-3 text-sm leading-7 text-gray-800">{line.ai_reply_draft}</pre>}
            </div>
          ))}
          {lines.length === 0 && <p className="text-sm text-gray-500">LINE履歴はまだありません。</p>}
        </div>
      </section>
    </div>
  )
}
