import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

type SearchParams = Record<string, string | string[] | undefined>
type CalendarItem = { id: number; customer_id: string | null; title: string | null; starts_at: string | null; status: string | null; ticket_usage_candidate: boolean | null }
type Customer = { id: string; full_name: string | null; parent_name: string | null; child_name: string | null; service_type: string; status: string; trial_date: string | null; next_reservation_at?: string | null }
type FollowTask = { id: number; customer_id: string; task_type: string; title: string; due_date: string | null; priority: string; ai_reason: string | null; customers?: { full_name: string | null; parent_name: string | null; child_name: string | null } | null }

function getServiceClient() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key || url.includes('placeholder')) return null; return createClient(url.replace(/\/+$/, ''), key) }
function valueOf(value: string | string[] | undefined, fallback = '') { return Array.isArray(value) ? value[0] || fallback : value || fallback }
async function getSearchParams(input: Promise<SearchParams> | SearchParams | undefined) { return input ? await Promise.resolve(input) : {} }
function todayJst() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) }
function nextDay(dateText: string) { const date = new Date(`${dateText}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10) }
function nameOf(item: { full_name?: string | null; parent_name?: string | null; child_name?: string | null }) { return item.full_name || item.parent_name || item.child_name || 'LINE' }
function serviceLabel(value: string | null) { const labels: Record<string, string> = { private_lesson: '個人レッスン', ashiwaza_dribble: '足技塾', sysc: 'SYSC', kids_school: 'キッズ', overseas: '海外', unknown: '未分類' }; return labels[value || 'unknown'] || value || '未分類' }
function statusLabel(value: string) { const labels: Record<string, string> = { new_inquiry: '新規問い合わせ', trial_scheduling: '体験調整中', trial_booked: '体験予約済み', trial_done: '体験完了', considering: '検討中', enrolled: '入会', continuing: '継続', paused: '休会', withdrawn: '退会' }; return labels[value] || value }
function formatDateTime(value: string | null | undefined) { if (!value) return '-'; return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
function customerHref(id: string | null, token: string) { return id ? `/admin/ai-secretary/customers/${id}?token=${encodeURIComponent(token)}` : `/admin/ai-secretary/customers?token=${encodeURIComponent(token)}` }

async function loadToday() {
  const supabase = getServiceClient()
  if (!supabase) return { error: 'supabase_not_configured' }
  const today = todayJst()
  const tomorrow = nextDay(today)
  const [calendarResult, trialResult, followResult] = await Promise.all([
    supabase.from('calendar_sync_sources').select('*').gte('starts_at', `${today}T00:00:00+09:00`).lt('starts_at', `${tomorrow}T00:00:00+09:00`).order('starts_at', { ascending: true }).limit(120),
    supabase.from('customers').select('id,full_name,parent_name,child_name,service_type,status,trial_date,next_reservation_at').or(`trial_date.eq.${today},status.eq.trial_booked,status.eq.trial_scheduling`).order('trial_date', { ascending: true, nullsFirst: false }).limit(120),
    supabase.from('follow_tasks').select('*, customers(full_name,parent_name,child_name)').eq('status', 'open').lte('due_date', today).order('due_date', { ascending: true }).limit(120),
  ])
  const error = calendarResult.error?.message || trialResult.error?.message || followResult.error?.message || null
  return { error, today, calendar: (calendarResult.data || []) as CalendarItem[], trials: (trialResult.data || []) as Customer[], followTasks: (followResult.data || []) as FollowTask[] }
}

export default async function TodayPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const params = await getSearchParams(searchParams)
  const token = valueOf(params.token)
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN
  if (!requiredToken || token !== requiredToken) return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>
  const data = await loadToday()
  if (data.error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">Today読み取りエラー: {data.error}</div>
  return <div className="space-y-6"><Header title="Today" subtitle="今日のレッスン、体験、フォローだけを見る画面です。" token={token} /><div className="grid gap-4 md:grid-cols-3"><CountCard label="今日のレッスン" value={data.calendar.length} /><CountCard label="体験・調整" value={data.trials.length} /><CountCard label="今日のフォロー" value={data.followTasks.length} /></div><Section title="今日のレッスン">{data.calendar.map((event) => <article key={event.id} className="rounded-xl border border-gray-100 bg-white p-4"><div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">{formatDateTime(event.starts_at)}</span>{event.ticket_usage_candidate && <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">回数券消化候補</span>}</div><p className="mt-3 font-black text-gray-900">{event.title || '予定'}</p></article>)}</Section><Section title="今日の体験・調整">{data.trials.map((customer) => <Link key={customer.id} href={customerHref(customer.id, token)} className="block rounded-xl border border-gray-100 bg-white p-4 hover:border-green-300"><div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-green-100 px-2 py-1 text-green-700">{serviceLabel(customer.service_type)}</span><span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">{statusLabel(customer.status)}</span></div><p className="mt-3 font-black text-gray-900">{nameOf(customer)}</p><p className="mt-1 text-xs text-gray-500">体験日: {customer.trial_date || '-'}</p></Link>)}</Section><Section title="今日のフォロー">{data.followTasks.map((task) => <Link key={task.id} href={customerHref(task.customer_id, token)} className="block rounded-xl border border-gray-100 bg-white p-4 hover:border-green-300"><div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-gray-900 px-2 py-1 text-white">{task.priority}</span><span className="rounded-full bg-yellow-100 px-2 py-1 text-yellow-700">期限 {task.due_date || '-'}</span></div><p className="mt-3 font-black text-gray-900">{nameOf(task.customers || {})}</p><p className="mt-1 text-sm text-gray-700">{task.title}</p>{task.ai_reason && <p className="mt-2 text-sm leading-6 text-gray-600">{task.ai_reason}</p>}</Link>)}</Section></div>
}

function Header({ title, subtitle, token }: { title: string; subtitle: string; token: string }) { return <div className="rounded-3xl bg-gray-950 p-6 text-white"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold text-green-300">Yatabe Daily OS</p><h2 className="mt-1 text-3xl font-black">{title}</h2><p className="mt-2 text-sm text-gray-300">{subtitle}</p></div><Link href={`/admin/ai-secretary/dashboard?token=${encodeURIComponent(token)}`} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-950">Morningへ</Link></div></div> }
function CountCard({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold text-gray-500">{label}</p><p className="mt-2 text-3xl font-black text-gray-900">{value}</p></div> }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5"><h3 className="text-lg font-black text-gray-900">{title}</h3><div className="mt-4 grid gap-3">{children}<EmptyGuard>{children}</EmptyGuard></div></section> }
function EmptyGuard({ children }: { children: React.ReactNode }) { return Array.isArray(children) && children.length === 0 ? <p className="text-sm text-gray-500">対象はありません。</p> : null }
