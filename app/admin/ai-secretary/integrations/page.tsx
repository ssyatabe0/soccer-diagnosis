import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

type SearchParams = Record<string, string | string[] | undefined>

type Gmail = { id: number; customer_id: string | null; from_email: string | null; subject: string | null; snippet: string | null; ai_summary: string | null; ai_reply_draft: string | null; status: string; needs_reply: boolean; occurred_at: string | null }
type Calendar = { id: number; customer_id: string | null; title: string | null; starts_at: string | null; status: string | null; ticket_usage_candidate: boolean | null; ai_summary: string | null }
type UsageCandidate = { id: number; customer_id: string | null; full_name: string | null; parent_name: string | null; child_name: string | null; product_name: string | null; remaining_count: number | null; candidate_date: string; lesson_title: string | null; suggested_used_count: number; status: string; ai_reason: string | null; calendar_summary: string | null }

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('placeholder')) return null
  return createClient(url.replace(/\/+$/, ''), key)
}
function valueOf(value: string | string[] | undefined, fallback = '') { return Array.isArray(value) ? value[0] || fallback : value || fallback }
async function getSearchParams(input: Promise<SearchParams> | SearchParams | undefined) { return input ? await Promise.resolve(input) : {} }
function formatDate(value: string | null | undefined) { return value ? new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '-' }
function nameOf(item: { full_name?: string | null; parent_name?: string | null; child_name?: string | null }) { return item.full_name || item.parent_name || item.child_name || '顧客未紐付け' }

async function loadData() {
  const supabase = getServiceClient()
  if (!supabase) return { error: 'supabase_not_configured', gmail: [], calendar: [], candidates: [] }
  const [gmailRes, calendarRes, candidatesRes] = await Promise.all([
    supabase.from('gmail_sync_sources').select('*').order('occurred_at', { ascending: false, nullsFirst: false }).limit(80),
    supabase.from('calendar_sync_sources').select('*').order('starts_at', { ascending: false, nullsFirst: false }).limit(80),
    supabase.from('ai_secretary_calendar_usage_candidates').select('*').eq('status', 'pending').order('candidate_date', { ascending: false }).limit(100),
  ])
  return {
    error: gmailRes.error?.message || calendarRes.error?.message || candidatesRes.error?.message || null,
    gmail: (gmailRes.data || []) as Gmail[],
    calendar: (calendarRes.data || []) as Calendar[],
    candidates: (candidatesRes.data || []) as UsageCandidate[],
  }
}

export default async function IntegrationsPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const params = await getSearchParams(searchParams)
  const token = valueOf(params.token)
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN
  if (!requiredToken || token !== requiredToken) return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>
  const { error, gmail, calendar, candidates } = await loadData()
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">連携データ読み取りエラー: {error}</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold text-green-700">Yatabe AI Secretary Phase7</p>
          <h2 className="text-2xl font-black text-gray-900">Gmail・Googleカレンダー連携</h2>
          <p className="mt-1 text-sm text-gray-500">自動送信・自動消化はせず、取り込み・要約・下書き・確認待ち候補を表示します。</p>
        </div>
        <Link href={`/admin/ai-secretary/dashboard?token=${encodeURIComponent(token)}`} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700">今日の対応へ</Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Kpi label="Gmail履歴" value={gmail.length} />
        <Kpi label="カレンダー履歴" value={calendar.length} />
        <Kpi label="回数券消化候補" value={candidates.length} />
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">回数券消化候補（確認待ち）</h3>
        <div className="mt-4 space-y-3">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">確認待ち</span>
                <span className="text-xs font-bold text-gray-500">{candidate.candidate_date}</span>
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">{candidate.suggested_used_count}回候補</span>
              </div>
              <Link href={candidate.customer_id ? `/admin/ai-secretary/customers/${candidate.customer_id}?token=${encodeURIComponent(token)}` : '#'} className="mt-3 block font-black text-gray-900 hover:text-green-700">{nameOf(candidate)}</Link>
              <p className="mt-2 text-sm text-gray-700">{candidate.lesson_title || 'レッスン予定'} / {candidate.product_name || '契約未選択'} / 残{candidate.remaining_count ?? '-'}回</p>
              {candidate.ai_reason && <p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm leading-7 text-blue-900">{candidate.ai_reason}</p>}
              <p className="mt-2 text-xs font-bold text-gray-500">確定は顧客詳細画面で行います。勝手には消化しません。</p>
            </div>
          ))}
          {candidates.length === 0 && <p className="text-sm text-gray-500">確認待ちの消化候補はありません。</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">Gmail取り込み履歴</h3>
        <div className="mt-4 space-y-3">
          {gmail.map((mail) => (
            <div key={mail.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">{mail.needs_reply ? '返信候補' : '確認済み'}</span><span className="text-xs font-bold text-gray-500">{formatDate(mail.occurred_at)}</span><span className="text-xs font-bold text-gray-500">{mail.from_email || '-'}</span></div>
              <p className="mt-3 font-black text-gray-900">{mail.subject || '件名なし'}</p>
              {mail.ai_summary && <p className="mt-2 rounded-lg bg-green-50 p-3 text-sm leading-7 text-green-900">AI要約: {mail.ai_summary}</p>}
              {mail.ai_reply_draft && <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-3 text-sm leading-7 text-gray-800">{mail.ai_reply_draft}</pre>}
            </div>
          ))}
          {gmail.length === 0 && <p className="text-sm text-gray-500">Gmailデータはまだありません。OAuth連携後に自動取り込みします。</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">Googleカレンダー取り込み履歴</h3>
        <div className="mt-4 space-y-3">
          {calendar.map((event) => (
            <div key={event.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">{event.status || 'scheduled'}</span><span className="text-xs font-bold text-gray-500">{formatDate(event.starts_at)}</span>{event.ticket_usage_candidate && <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">消化候補元</span>}</div>
              <p className="mt-3 font-black text-gray-900">{event.title || '予定'}</p>
              {event.ai_summary && <p className="mt-2 rounded-lg bg-green-50 p-3 text-sm leading-7 text-green-900">AI要約: {event.ai_summary}</p>}
            </div>
          ))}
          {calendar.length === 0 && <p className="text-sm text-gray-500">カレンダーデータはまだありません。OAuth連携後に自動取り込みします。</p>}
        </div>
      </section>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-xs font-bold text-gray-500">{label}</p><p className="mt-2 text-4xl font-black text-gray-900">{value}</p></div>
}
