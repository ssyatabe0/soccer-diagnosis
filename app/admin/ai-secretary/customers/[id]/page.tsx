import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { CustomerEditor } from '@/components/ai-secretary/CustomerEditor'
import { CustomerRevenueActions } from '@/components/ai-secretary/CustomerRevenueActions'
import { ProfileGenerateButton } from '@/components/ai-secretary/ProfileGenerateButton'
import { ContractDocumentActions } from '@/components/ai-secretary/ContractDocumentActions'
import { CalendarUsageCandidateActions } from '@/components/ai-secretary/CalendarUsageCandidateActions'

type SearchParams = Record<string, string | string[] | undefined>

type Customer = {
  id: string
  full_name: string | null
  parent_name: string | null
  child_name: string | null
  email: string | null
  phone: string | null
  address: string | null
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
  payment_method: string | null
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

type GmailSource = {
  id: number
  from_email: string | null
  subject: string | null
  snippet: string | null
  ai_summary: string | null
  ai_reply_draft: string | null
  needs_reply: boolean | null
  status: string | null
  occurred_at: string | null
}

type CalendarSource = {
  id: number
  title: string | null
  starts_at: string | null
  status: string | null
  ticket_usage_candidate: boolean | null
  ai_summary: string | null
}

type UsageCandidate = {
  id: number
  candidate_date: string
  lesson_title: string | null
  suggested_used_count: number
  status: string
  ai_reason: string | null
  product_name: string | null
  remaining_count: number | null
}

type Contract = {
  id: string
  product_name: string | null
  product_type: string | null
  status: string
  purchase_date: string | null
  start_date: string | null
  first_usage_date: string | null
  effective_valid_until: string | null
  total_ticket_count: number | null
  total_used_count: number | null
  remaining_count: number | null
  amount: number | null
  monthly_fee: number | null
  payment_status: string | null
  notes: string | null
}

type TicketUsage = {
  id: number
  contract_id: string
  usage_date: string
  used_count: number
  lesson_title: string | null
  notes: string | null
}

type FollowTask = {
  id: number
  task_type: string
  title: string
  due_date: string | null
  status: string
  priority: string
  ai_reason: string | null
}

type SalesCandidate = {
  candidate_type: string
  product_name: string | null
  remaining_count: number | null
  effective_valid_until: string | null
  priority: string
  ai_reason: string | null
}

type Product = {
  id: string
  name: string
  product_type: string
  ticket_count: number | null
  price: number | null
  monthly_fee: number | null
}

type ContractTemplate = {
  id: string
  name: string
  service_type: string
  document_type: string
}

type ContractDocument = {
  id: string
  title: string
  status: string
  file_name: string | null
  ai_suggestion: string | null
  notes: string | null
  created_at: string
}

type AiProfile = {
  overview: string | null
  pain_points: string | null
  inquiry_reason: string | null
  contract_reason: string | null
  continuation_reason: string | null
  churn_reason: string | null
  current_relationship: string | null
  reproposal_score: string | null
  review_request_score: string | null
  recommended_service: string | null
  caution_notes: string | null
  source_summary: string | null
  generated_at: string | null
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
  if (!supabase) {
    return {
      customer: null,
      timeline: [] as TimelineEvent[],
      lines: [] as LineMessage[],
      gmail: [] as GmailSource[],
      calendar: [] as CalendarSource[],
      usageCandidates: [] as UsageCandidate[],
      contracts: [] as Contract[],
      ticketUsage: [] as TicketUsage[],
      followTasks: [] as FollowTask[],
      salesCandidates: [] as SalesCandidate[],
      products: [] as Product[],
      contractTemplates: [] as ContractTemplate[],
      contractDocuments: [] as ContractDocument[],
      aiProfile: null as AiProfile | null,
      error: 'supabase_not_configured',
    }
  }

  const [
    { data: customer, error: customerError },
    { data: timeline, error: timelineError },
    { data: lines, error: linesError },
    { data: gmail, error: gmailError },
    { data: calendar, error: calendarError },
    { data: usageCandidates, error: usageCandidatesError },
    { data: contracts, error: contractsError },
    { data: ticketUsage, error: ticketUsageError },
    { data: followTasks, error: followTasksError },
    { data: salesCandidates, error: salesCandidatesError },
    { data: products, error: productsError },
    { data: aiProfile, error: aiProfileError },
    { data: contractTemplates, error: contractTemplatesError },
    { data: contractDocuments, error: contractDocumentsError },
  ] = await Promise.all([
    supabase.from('customers').select('*').eq('id', id).single(),
    supabase.from('customer_timeline_events').select('*').eq('customer_id', id).order('occurred_at', { ascending: false }).limit(100),
    supabase.from('ai_secretary_line_inbox').select('*').eq('customer_id', id).order('occurred_at', { ascending: false }).limit(100),
    supabase.from('gmail_sync_sources').select('*').eq('customer_id', id).order('occurred_at', { ascending: false, nullsFirst: false }).limit(100),
    supabase.from('calendar_sync_sources').select('*').eq('customer_id', id).order('starts_at', { ascending: false, nullsFirst: false }).limit(100),
    supabase.from('ai_secretary_calendar_usage_candidates').select('*').eq('customer_id', id).eq('status', 'pending').order('candidate_date', { ascending: false }).limit(100),
    supabase.from('ai_secretary_contracts').select('*').eq('customer_id', id).order('purchase_date', { ascending: false, nullsFirst: false }).limit(100),
    supabase.from('ticket_usage').select('*').eq('customer_id', id).order('usage_date', { ascending: false }).limit(100),
    supabase.from('follow_tasks').select('*').eq('customer_id', id).order('due_date', { ascending: true, nullsFirst: false }).limit(100),
    supabase.from('ai_secretary_sales_candidates').select('*').eq('customer_id', id).limit(100),
    supabase.from('products').select('id,name,product_type,ticket_count,price,monthly_fee').eq('is_active', true).order('service_type', { ascending: true }),
    supabase.from('customer_ai_profiles').select('*').eq('customer_id', id).maybeSingle(),
    supabase.from('contract_templates').select('id,name,service_type,document_type').eq('is_active', true).order('service_type', { ascending: true }),
    supabase.from('contract_documents').select('id,title,status,file_name,ai_suggestion,notes,created_at').eq('customer_id', id).order('created_at', { ascending: false }).limit(100),
  ])

  const error = customerError?.message || timelineError?.message || linesError?.message || gmailError?.message || calendarError?.message || usageCandidatesError?.message || contractsError?.message || ticketUsageError?.message || followTasksError?.message || salesCandidatesError?.message || productsError?.message || aiProfileError?.message || contractTemplatesError?.message || contractDocumentsError?.message || null
  return {
    customer: customer as Customer | null,
    timeline: (timeline || []) as TimelineEvent[],
    lines: (lines || []) as LineMessage[],
    gmail: (gmail || []) as GmailSource[],
    calendar: (calendar || []) as CalendarSource[],
    usageCandidates: (usageCandidates || []) as UsageCandidate[],
    contracts: (contracts || []) as Contract[],
    ticketUsage: (ticketUsage || []) as TicketUsage[],
    followTasks: (followTasks || []) as FollowTask[],
    salesCandidates: (salesCandidates || []) as SalesCandidate[],
    products: (products || []) as Product[],
    contractTemplates: (contractTemplates || []) as ContractTemplate[],
    contractDocuments: (contractDocuments || []) as ContractDocument[],
    aiProfile: aiProfile as AiProfile | null,
    error,
  }
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
    private_lesson_reproposal: '個人レッスン再提案候補',
  }
  return labels[type] || type
}

function formatDateOnly(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
}

function formatYen(value: number | null) {
  if (value === null || value === undefined) return '-'
  return `${value.toLocaleString()}円`
}

export default async function AiSecretaryCustomerDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<SearchParams> | SearchParams }) {
  const [{ id }, query] = await Promise.all([params, getSearchParams(searchParams)])
  const token = valueOf(query.token)
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN

  if (!requiredToken || token !== requiredToken) {
    return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>
  }

  const { customer, timeline, lines, gmail, calendar, usageCandidates, contracts, ticketUsage, followTasks, salesCandidates, products, contractTemplates, contractDocuments, aiProfile, error } = await loadCustomer(id)

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

      <ContractDocumentActions customerId={customer.id} token={token} templates={contractTemplates} documents={contractDocuments} />

      <CalendarUsageCandidateActions token={token} candidates={usageCandidates} />

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-900">AI人物カルテ</h3>
            <p className="mt-1 text-xs text-gray-500">LINE・Gmail・カレンダー・契約履歴から第二の脳用カルテを生成します。</p>
          </div>
          <ProfileGenerateButton customerId={customer.id} token={token} />
        </div>
        {aiProfile ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ProfileBlock label="人物概要" value={aiProfile.overview} />
            <ProfileBlock label="悩み" value={aiProfile.pain_points} />
            <ProfileBlock label="問い合わせ理由" value={aiProfile.inquiry_reason} />
            <ProfileBlock label="契約理由" value={aiProfile.contract_reason} />
            <ProfileBlock label="継続理由" value={aiProfile.continuation_reason} />
            <ProfileBlock label="辞めた理由" value={aiProfile.churn_reason} />
            <ProfileBlock label="現在の関係性" value={aiProfile.current_relationship} />
            <ProfileBlock label="再提案可能性" value={aiProfile.reproposal_score} />
            <ProfileBlock label="レビュー依頼可能性" value={aiProfile.review_request_score} />
            <ProfileBlock label="おすすめサービス" value={aiProfile.recommended_service} />
            <ProfileBlock label="要注意事項" value={aiProfile.caution_notes} />
            <ProfileBlock label="根拠サマリー" value={aiProfile.source_summary} />
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">まだAI人物カルテはありません。ボタンで生成できます。</p>
        )}
      </section>

      <CustomerRevenueActions customerId={customer.id} token={token} products={products} contracts={contracts} followTasks={followTasks} />

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-900">売上・契約サマリー</h3>
            <p className="mt-1 text-xs text-gray-500">契約履歴、購入履歴、残回数、有効期限、フォロー候補を確認します。</p>
          </div>
          <Link href={`/admin/ai-secretary/revenue?token=${encodeURIComponent(token)}`} className="rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white">売上候補一覧へ</Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-green-50 p-4 text-green-900">
            <p className="text-xs font-bold opacity-70">契約数</p>
            <p className="mt-1 text-3xl font-black">{contracts.length}</p>
          </div>
          <div className="rounded-xl bg-yellow-50 p-4 text-yellow-900">
            <p className="text-xs font-bold opacity-70">未完了フォロー</p>
            <p className="mt-1 text-3xl font-black">{followTasks.filter((task) => task.status === 'open').length}</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-4 text-blue-900">
            <p className="text-xs font-bold opacity-70">AI売上候補</p>
            <p className="mt-1 text-3xl font-black">{salesCandidates.length}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">契約履歴・購入履歴</h3>
        <div className="mt-4 space-y-3">
          {contracts.map((contract) => (
            <div key={contract.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">{contract.status}</span>
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">{contract.product_name || contract.product_type || '契約'}</span>
                <span className="text-xs font-bold text-gray-500">購入 {formatDateOnly(contract.purchase_date)}</span>
                <span className="text-xs font-bold text-gray-500">期限 {formatDateOnly(contract.effective_valid_until)}</span>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <MiniStat label="購入回数" value={contract.total_ticket_count === null ? '-' : `${contract.total_ticket_count}回`} />
                <MiniStat label="消化回数" value={contract.total_used_count === null ? '-' : `${contract.total_used_count}回`} />
                <MiniStat label="残回数" value={contract.remaining_count === null ? '-' : `${contract.remaining_count}回`} />
                <MiniStat label="金額/月謝" value={contract.amount !== null ? formatYen(contract.amount) : formatYen(contract.monthly_fee)} />
              </div>
              {contract.notes && <p className="mt-3 rounded-lg bg-white p-3 text-sm leading-7 text-gray-700">{contract.notes}</p>}
            </div>
          ))}
          {contracts.length === 0 && <p className="text-sm text-gray-500">契約履歴はまだありません。</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">AI売上・再提案候補</h3>
        <div className="mt-4 space-y-3">
          {salesCandidates.map((candidate, index) => (
            <div key={`${candidate.candidate_type}-${index}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">{candidateLabel(candidate.candidate_type)}</span>
                <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">{candidate.priority}</span>
                {candidate.remaining_count !== null && <span className="text-xs font-bold text-gray-500">残 {candidate.remaining_count}回</span>}
                {candidate.effective_valid_until && <span className="text-xs font-bold text-gray-500">期限 {formatDateOnly(candidate.effective_valid_until)}</span>}
              </div>
              {candidate.ai_reason && <p className="mt-3 rounded-lg bg-white p-3 text-sm leading-7 text-gray-700">{candidate.ai_reason}</p>}
            </div>
          ))}
          {salesCandidates.length === 0 && <p className="text-sm text-gray-500">AI売上候補はまだありません。</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">フォロー履歴</h3>
        <div className="mt-4 space-y-3">
          {followTasks.map((task) => (
            <div key={task.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">{candidateLabel(task.task_type)}</span>
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">{task.status}</span>
                <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">{task.priority}</span>
                <span className="text-xs font-bold text-gray-500">期限 {formatDateOnly(task.due_date)}</span>
              </div>
              <p className="mt-3 font-bold text-gray-900">{task.title}</p>
              {task.ai_reason && <p className="mt-2 rounded-lg bg-white p-3 text-sm leading-7 text-gray-700">{task.ai_reason}</p>}
            </div>
          ))}
          {followTasks.length === 0 && <p className="text-sm text-gray-500">フォロー履歴はまだありません。</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">回数消化履歴</h3>
        <div className="mt-4 space-y-3">
          {ticketUsage.map((usage) => (
            <div key={usage.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">{formatDateOnly(usage.usage_date)}</span>
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">{usage.used_count}回消化</span>
              </div>
              {usage.lesson_title && <p className="mt-3 font-bold text-gray-900">{usage.lesson_title}</p>}
              {usage.notes && <p className="mt-2 rounded-lg bg-white p-3 text-sm leading-7 text-gray-700">{usage.notes}</p>}
            </div>
          ))}
          {ticketUsage.length === 0 && <p className="text-sm text-gray-500">回数消化履歴はまだありません。</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">Gmail履歴</h3>
        <div className="mt-4 space-y-3">
          {gmail.map((mail) => (
            <div key={mail.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">{mail.needs_reply ? '返信候補' : mail.status || 'Gmail'}</span>
                <span className="text-xs font-bold text-gray-500">{formatDate(mail.occurred_at)}</span>
                {mail.from_email && <span className="text-xs font-bold text-gray-500">{mail.from_email}</span>}
              </div>
              <p className="mt-3 font-bold text-gray-900">{mail.subject || '件名なし'}</p>
              {mail.snippet && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-3 text-sm leading-7 text-gray-700">{mail.snippet}</p>}
              {mail.ai_summary && <p className="mt-2 rounded-lg bg-green-50 p-3 text-sm leading-7 text-green-900">AI要約: {mail.ai_summary}</p>}
              {mail.ai_reply_draft && <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-gray-100 bg-white p-3 text-sm leading-7 text-gray-800">{mail.ai_reply_draft}</pre>}
            </div>
          ))}
          {gmail.length === 0 && <p className="text-sm text-gray-500">Gmail履歴はまだありません。</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">Googleカレンダー履歴</h3>
        <div className="mt-4 space-y-3">
          {calendar.map((event) => (
            <div key={event.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">{event.status || 'scheduled'}</span>
                <span className="text-xs font-bold text-gray-500">{formatDate(event.starts_at)}</span>
                {event.ticket_usage_candidate && <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">消化候補元</span>}
              </div>
              <p className="mt-3 font-bold text-gray-900">{event.title || '予定'}</p>
              {event.ai_summary && <p className="mt-2 rounded-lg bg-green-50 p-3 text-sm leading-7 text-green-900">AI要約: {event.ai_summary}</p>}
            </div>
          ))}
          {calendar.length === 0 && <p className="text-sm text-gray-500">Googleカレンダー履歴はまだありません。</p>}
        </div>
      </section>

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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-xs font-bold text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-black text-gray-900">{value}</p>
    </div>
  )
}

function ProfileBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-black text-gray-500">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-800">{value || '-'}</p>
    </div>
  )
}
