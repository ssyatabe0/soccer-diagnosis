import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

type SearchParams = Record<string, string | string[] | undefined>

type LineItem = {
  id: number
  customer_id: string | null
  body: string
  account_display_name: string | null
  customer_full_name: string | null
  customer_parent_name: string | null
  customer_child_name: string | null
  ai_summary: string | null
  ai_reply_draft: string | null
  occurred_at: string
}

type Customer = {
  id: string
  full_name: string | null
  parent_name: string | null
  child_name: string | null
  service_type: string
  status: string
  trial_date: string | null
  last_contact_at: string | null
}

type SalesCandidate = {
  customer_id: string
  full_name: string | null
  parent_name: string | null
  child_name: string | null
  customer_service_type: string | null
  customer_status: string | null
  candidate_type: string
  product_name: string | null
  remaining_count: number | null
  effective_valid_until: string | null
  priority: string
  ai_reason: string | null
}

type FollowTask = {
  id: number
  customer_id: string
  task_type: string
  title: string
  due_date: string | null
  priority: string
  ai_reason: string | null
  customers?: {
    full_name: string | null
    parent_name: string | null
    child_name: string | null
    service_type: string | null
    status: string | null
  } | null
}

type GmailItem = {
  id: number
  customer_id: string | null
  from_email: string | null
  subject: string | null
  snippet: string | null
  ai_summary: string | null
  ai_reply_draft: string | null
  occurred_at: string | null
}

type CalendarItem = {
  id: number
  customer_id: string | null
  title: string | null
  starts_at: string | null
  status: string | null
  ticket_usage_candidate: boolean | null
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

function todayJst() {
  const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' })
  return formatter.format(new Date())
}

function currentMonthStart() {
  const today = todayJst()
  return `${today.slice(0, 7)}-01`
}

function nextDay(dateText: string) {
  const date = new Date(`${dateText}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

async function loadDashboard() {
  const supabase = getServiceClient()
  if (!supabase) {
    return { error: 'supabase_not_configured' }
  }

  const today = todayJst()
  const tomorrow = nextDay(today)
  const month = currentMonthStart()

  const [
    lineResult,
    gmailResult,
    customersResult,
    salesResult,
    followResult,
    calendarResult,
  ] = await Promise.all([
    supabase.from('ai_secretary_line_inbox').select('*').eq('status', 'needs_review').order('occurred_at', { ascending: false }).limit(80),
    supabase.from('gmail_sync_sources').select('*').eq('needs_reply', true).eq('status', 'needs_review').order('occurred_at', { ascending: false, nullsFirst: false }).limit(80),
    supabase.from('customers').select('id,full_name,parent_name,child_name,service_type,status,trial_date,last_contact_at').in('status', ['new_inquiry', 'trial_scheduling', 'trial_booked', 'trial_done']).order('last_contact_at', { ascending: false, nullsFirst: false }).limit(120),
    supabase.from('ai_secretary_sales_candidates').select('*').eq('expected_month', month).limit(300),
    supabase.from('follow_tasks').select('*, customers(full_name,parent_name,child_name,service_type,status)').eq('status', 'open').lte('due_date', today).order('due_date', { ascending: true }).limit(120),
    supabase.from('calendar_sync_sources').select('*').gte('starts_at', `${today}T00:00:00+09:00`).lt('starts_at', `${tomorrow}T00:00:00+09:00`).order('starts_at', { ascending: true }).limit(80),
  ])

  const error = lineResult.error?.message || gmailResult.error?.message || customersResult.error?.message || salesResult.error?.message || followResult.error?.message || calendarResult.error?.message || null

  return {
    error,
    today,
    month,
    lines: (lineResult.data || []) as LineItem[],
    gmail: (gmailResult.data || []) as GmailItem[],
    customers: (customersResult.data || []) as Customer[],
    sales: (salesResult.data || []) as SalesCandidate[],
    followTasks: (followResult.data || []) as FollowTask[],
    calendar: (calendarResult.data || []) as CalendarItem[],
  }
}

function nameOf(item: { full_name?: string | null; parent_name?: string | null; child_name?: string | null }) {
  return item.full_name || item.parent_name || item.child_name || '名称未設定'
}

function lineName(item: LineItem) {
  return item.customer_full_name || item.customer_parent_name || item.customer_child_name || 'LINE顧客候補'
}

function candidateLabel(type: string) {
  const labels: Record<string, string> = {
    remaining_1: '残り1回',
    remaining_2: '残り2回',
    expiry_30: '期限30日前',
    expiry_14: '期限14日前',
    expiry_7: '期限7日前',
    unused_90: '90日未利用',
    review_request: 'レビュー依頼候補',
    ashiwaza_candidate: '足技塾候補',
    sysc_candidate: 'SYSC候補',
    kids_school_candidate: 'キッズスクール候補',
    private_lesson_reproposal: '個人レッスン再提案候補',
  }
  return labels[type] || type
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    new_inquiry: '新規問い合わせ',
    trial_scheduling: '体験調整中',
    trial_booked: '体験予約済み',
    trial_done: '体験後未フォロー',
  }
  return labels[status] || status
}

function serviceLabel(type: string | null) {
  const labels: Record<string, string> = {
    private_lesson: '個人レッスン',
    ashiwaza_dribble: '足技塾',
    sysc: 'SYSC',
    kids_school: 'キッズスクール',
    overseas: '海外',
    unknown: '未分類',
  }
  return labels[type || 'unknown'] || type || '未分類'
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function aiLineDraft(text: string) {
  const compact = text.replace(/\s+/g, ' ').slice(0, 90)
  return `ご連絡ありがとうございます。\n内容確認しました。\n「${compact}」について確認して、改めてご案内いたします。\n谷田部`
}

function aiMailDraft(subject: string | null) {
  return `お問い合わせありがとうございます。\n${subject ? `「${subject}」の件、` : ''}内容を確認しました。\n詳細を確認のうえ、改めてご連絡いたします。\n谷田部`
}

function nextActionForCandidate(type: string) {
  if (type === 'remaining_1' || type === 'remaining_2') return '継続回数券の提案文を作る'
  if (type.startsWith('expiry_')) return '期限前フォロー文を送る準備'
  if (type === 'unused_90') return '近況確認と再開提案'
  if (type === 'review_request') return 'レビュー依頼文を送る準備'
  if (type === 'ashiwaza_candidate') return '足技塾への誘導文を作る'
  if (type === 'sysc_candidate') return 'SYSC案内の可否を確認'
  if (type === 'kids_school_candidate') return 'キッズスクール体験案内を作る'
  if (type === 'private_lesson_reproposal') return '個人レッスン再提案文を作る'
  return 'フォロー内容を確認'
}

export default async function AiSecretaryDashboardPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const query = await getSearchParams(searchParams)
  const token = valueOf(query.token)
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN

  if (!requiredToken || token !== requiredToken) {
    return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>
  }

  const loaded = await loadDashboard()
  if (loaded.error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">ダッシュボード読み取りエラー: {loaded.error}</div>
  }

  const lines = loaded.lines || []
  const gmail = loaded.gmail || []
  const customers = loaded.customers || []
  const sales = loaded.sales || []
  const followTasks = loaded.followTasks || []
  const calendar = loaded.calendar || []
  const trialScheduling = customers.filter((customer) => customer.status === 'trial_scheduling')
  const trialBooked = customers.filter((customer) => customer.status === 'trial_booked')
  const trialDone = customers.filter((customer) => customer.status === 'trial_done')
  const newInquiry = customers.filter((customer) => customer.status === 'new_inquiry')
  const expiring = sales.filter((item) => ['expiry_30', 'expiry_14', 'expiry_7'].includes(item.candidate_type))
  const todayFollow = [
    ...followTasks,
    ...sales.filter((item) => ['remaining_1', 'remaining_2', 'unused_90', 'review_request', 'ashiwaza_candidate', 'sysc_candidate', 'kids_school_candidate', 'private_lesson_reproposal'].includes(item.candidate_type)),
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold text-green-700">Yatabe AI Secretary Phase4</p>
          <h2 className="text-2xl font-black text-gray-900">AI経営ダッシュボード</h2>
          <p className="mt-1 text-sm text-gray-500">毎朝ここを見るだけで、今日返す・今日追う・今月売上にする相手を確認します。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/ai-secretary/revenue?token=${encodeURIComponent(token)}`} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700">売上候補</Link>
          <Link href={`/admin/ai-secretary/customers?token=${encodeURIComponent(token)}`} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700">顧客検索</Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="今日返すLINE" value={lines.length} tone="red" />
        <Kpi label="未返信Gmail" value={gmail.length} tone="yellow" />
        <Kpi label="今月売上候補" value={sales.length} tone="green" />
        <Kpi label="今日フォロー" value={todayFollow.length} tone="blue" />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="新規問い合わせ" value={newInquiry.length} tone="gray" />
        <Kpi label="体験調整中" value={trialScheduling.length} tone="gray" />
        <Kpi label="体験予約済み" value={trialBooked.length} tone="gray" />
        <Kpi label="体験後未フォロー" value={trialDone.length} tone="gray" />
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">今日返すLINE・未対応LINE</h3>
        <div className="mt-4 space-y-3">
          {lines.map((line) => (
            <div key={line.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">未対応LINE</span>
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">{line.account_display_name || 'LINE'}</span>
                <span className="text-xs font-bold text-gray-500">{formatDateTime(line.occurred_at)}</span>
              </div>
              <Link href={line.customer_id ? `/admin/ai-secretary/customers/${line.customer_id}?token=${encodeURIComponent(token)}` : `/admin/ai-secretary/line-inbox?token=${encodeURIComponent(token)}`} className="mt-3 block text-base font-black text-gray-900 hover:text-green-700">
                {lineName(line)}
              </Link>
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-3 text-sm leading-7 text-gray-800">{line.body}</p>
              <p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm leading-7 text-blue-900">次にやること: 内容確認後、返信文をコピーしてLINE公式で返信</p>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-gray-100 bg-white p-3 text-sm leading-7 text-gray-800">{line.ai_reply_draft || aiLineDraft(line.body)}</pre>
              <button type="button" className="mt-3 rounded-full border border-gray-300 px-4 py-2 text-xs font-bold text-gray-500" disabled>送信ボタン準備中（Phase5）</button>
            </div>
          ))}
          {lines.length === 0 && <p className="text-sm text-gray-500">未対応LINEはありません。</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">未返信Gmail</h3>
        <div className="mt-4 space-y-3">
          {gmail.map((mail) => (
            <div key={mail.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">未返信Gmail</span>
                <span className="text-xs font-bold text-gray-500">{formatDateTime(mail.occurred_at)}</span>
                {mail.from_email && <span className="text-xs font-bold text-gray-500">{mail.from_email}</span>}
              </div>
              <p className="mt-3 font-black text-gray-900">{mail.subject || '件名なし'}</p>
              {mail.snippet && <p className="mt-2 rounded-lg bg-white p-3 text-sm leading-7 text-gray-700">{mail.snippet}</p>}
              <p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm leading-7 text-blue-900">次にやること: メール内容を確認し、返信下書きをコピーしてGmailで返信</p>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-gray-100 bg-white p-3 text-sm leading-7 text-gray-800">{mail.ai_reply_draft || aiMailDraft(mail.subject)}</pre>
              <button type="button" className="mt-3 rounded-full border border-gray-300 px-4 py-2 text-xs font-bold text-gray-500" disabled>送信ボタン準備中（Phase5）</button>
            </div>
          ))}
          {gmail.length === 0 && <p className="text-sm text-gray-500">Gmail連携データはまだありません。追加権限設定後に表示されます。</p>}
        </div>
      </section>

      <DashboardGroup title="体験・問い合わせ" token={token} customers={[...newInquiry, ...trialScheduling, ...trialBooked, ...trialDone]} />
      <SalesGroup title="今月売上候補・再提案候補" token={token} items={sales} />
      <SalesGroup title="今月失効候補" token={token} items={expiring} />
      <FollowGroup title="今月フォロー対象" token={token} items={todayFollow} />

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">今日のGoogleカレンダー予定</h3>
        <div className="mt-4 space-y-3">
          {calendar.map((event) => (
            <div key={event.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">{event.status || 'scheduled'}</span>
                <span className="text-xs font-bold text-gray-500">{formatDateTime(event.starts_at)}</span>
                {event.ticket_usage_candidate && <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">回数券消化候補</span>}
              </div>
              <p className="mt-3 font-black text-gray-900">{event.title || '予定'}</p>
            </div>
          ))}
          {calendar.length === 0 && <p className="text-sm text-gray-500">Googleカレンダー連携データはまだありません。追加権限設定後に表示されます。</p>}
        </div>
      </section>
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: 'red' | 'yellow' | 'green' | 'blue' | 'gray' }) {
  const classes = {
    red: 'border-red-200 bg-red-50 text-red-900',
    yellow: 'border-yellow-200 bg-yellow-50 text-yellow-900',
    green: 'border-green-200 bg-green-50 text-green-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    gray: 'border-gray-200 bg-white text-gray-900',
  }
  return <div className={`rounded-2xl border p-5 ${classes[tone]}`}><p className="text-xs font-bold opacity-70">{label}</p><p className="mt-2 text-4xl font-black">{value}</p></div>
}

function DashboardGroup({ title, customers, token }: { title: string; customers: Customer[]; token: string }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-gray-900">{title}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {customers.map((customer) => (
          <Link key={customer.id} href={`/admin/ai-secretary/customers/${customer.id}?token=${encodeURIComponent(token)}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4 hover:border-green-300">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">{statusLabel(customer.status)}</span>
              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">{serviceLabel(customer.service_type)}</span>
            </div>
            <p className="mt-3 font-black text-gray-900">{nameOf(customer)}</p>
            <p className="mt-1 text-xs font-bold text-gray-500">次にやること: {customer.status === 'trial_done' ? '体験後フォロー' : customer.status === 'trial_booked' ? '体験前確認' : customer.status === 'trial_scheduling' ? '日程調整' : '初回返信・ヒアリング'}</p>
          </Link>
        ))}
        {customers.length === 0 && <p className="text-sm text-gray-500">対象はありません。</p>}
      </div>
    </section>
  )
}

function SalesGroup({ title, items, token }: { title: string; items: SalesCandidate[]; token: string }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-gray-900">{title}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map((item, index) => (
          <Link key={`${item.customer_id}-${item.candidate_type}-${index}`} href={`/admin/ai-secretary/customers/${item.customer_id}?token=${encodeURIComponent(token)}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4 hover:border-green-300">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">{candidateLabel(item.candidate_type)}</span>
              <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">{item.priority}</span>
              {item.remaining_count !== null && <span className="text-xs font-bold text-gray-500">残{item.remaining_count}回</span>}
            </div>
            <p className="mt-3 font-black text-gray-900">{nameOf(item)}</p>
            <p className="mt-1 text-xs font-bold text-gray-500">次にやること: {nextActionForCandidate(item.candidate_type)}</p>
            {item.ai_reason && <p className="mt-2 text-sm leading-6 text-gray-700">{item.ai_reason}</p>}
          </Link>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-500">対象はありません。</p>}
      </div>
    </section>
  )
}

function FollowGroup({ title, items, token }: { title: string; items: Array<SalesCandidate | FollowTask>; token: string }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-gray-900">{title}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map((item, index) => {
          const isTask = 'task_type' in item
          const customerId = item.customer_id
          const label = isTask ? candidateLabel(item.task_type) : candidateLabel(item.candidate_type)
          const name = isTask ? nameOf(item.customers || {}) : nameOf(item)
          const reason = isTask ? item.ai_reason : item.ai_reason
          return (
            <Link key={`${customerId}-${label}-${index}`} href={`/admin/ai-secretary/customers/${customerId}?token=${encodeURIComponent(token)}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4 hover:border-green-300">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">{label}</span>
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">{item.priority}</span>
              </div>
              <p className="mt-3 font-black text-gray-900">{name}</p>
              <p className="mt-1 text-xs font-bold text-gray-500">次にやること: {isTask ? item.title : nextActionForCandidate(item.candidate_type)}</p>
              {reason && <p className="mt-2 text-sm leading-6 text-gray-700">{reason}</p>}
            </Link>
          )
        })}
        {items.length === 0 && <p className="text-sm text-gray-500">対象はありません。</p>}
      </div>
    </section>
  )
}
