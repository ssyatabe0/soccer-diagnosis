import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

type SearchParams = Record<string, string | string[] | undefined>

type LineItem = { id: number; customer_id: string | null; body: string; account_display_name: string | null; customer_full_name: string | null; customer_parent_name: string | null; customer_child_name: string | null; ai_summary: string | null; ai_reply_draft: string | null; occurred_at: string }
type Customer = { id: string; full_name: string | null; parent_name: string | null; child_name: string | null; service_type: string; status: string; trial_date: string | null; last_contact_at: string | null }
type SalesCandidate = { customer_id: string; full_name: string | null; parent_name: string | null; child_name: string | null; customer_service_type: string | null; customer_status: string | null; candidate_type: string; product_name: string | null; remaining_count: number | null; effective_valid_until: string | null; expected_amount: number | null; priority: string; ai_reason: string | null }
type FollowTask = { id: number; customer_id: string; task_type: string; title: string; due_date: string | null; priority: string; ai_reason: string | null; draft_message?: string | null; customers?: { full_name: string | null; parent_name: string | null; child_name: string | null; service_type: string | null; status: string | null } | null }
type GmailItem = { id: number; customer_id: string | null; from_email: string | null; subject: string | null; snippet: string | null; ai_summary: string | null; ai_reply_draft: string | null; occurred_at: string | null }
type CalendarItem = { id: number; customer_id: string | null; title: string | null; starts_at: string | null; status: string | null; ticket_usage_candidate: boolean | null }
type UsageCandidate = { id: number; customer_id: string | null; lesson_title: string | null; candidate_date: string; suggested_used_count: number; full_name: string | null; parent_name: string | null; child_name: string | null; ai_reason: string | null }
type ContractAmount = { amount: number | null; monthly_fee: number | null; purchase_date: string | null; status: string | null }

type BriefItem = { title: string; detail: string; href: string; tone?: 'red' | 'yellow' | 'green' | 'blue' | 'gray' }

function getServiceClient() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key || url.includes('placeholder')) return null; return createClient(url.replace(/\/+$/, ''), key) }
function valueOf(value: string | string[] | undefined, fallback = '') { return Array.isArray(value) ? value[0] || fallback : value || fallback }
async function getSearchParams(input: Promise<SearchParams> | SearchParams | undefined) { return input ? await Promise.resolve(input) : {} }
function todayJst() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) }
function currentMonthStart() { const today = todayJst(); return `${today.slice(0, 7)}-01` }
function nextDay(dateText: string) { const date = new Date(`${dateText}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10) }
function nextMonthStart(month: string) { const date = new Date(`${month}T00:00:00.000Z`); date.setUTCMonth(date.getUTCMonth() + 1); return date.toISOString().slice(0, 10) }

async function loadDashboard() {
  const supabase = getServiceClient()
  if (!supabase) return { error: 'supabase_not_configured' }
  const today = todayJst()
  const tomorrow = nextDay(today)
  const month = currentMonthStart()
  const nextMonth = nextMonthStart(month)

  const [lineResult, gmailResult, customersResult, salesResult, tasksResult, calendarResult, usageCandidateResult, contractResult] = await Promise.all([
    supabase.from('ai_secretary_line_inbox').select('*').eq('status', 'needs_review').order('occurred_at', { ascending: false }).limit(80),
    supabase.from('gmail_sync_sources').select('*').eq('needs_reply', true).eq('status', 'needs_review').order('occurred_at', { ascending: false, nullsFirst: false }).limit(80),
    supabase.from('customers').select('id,full_name,parent_name,child_name,service_type,status,trial_date,last_contact_at').in('status', ['new_inquiry', 'trial_scheduling', 'trial_booked', 'trial_done']).order('last_contact_at', { ascending: false, nullsFirst: false }).limit(160),
    supabase.from('ai_secretary_sales_candidates').select('*').eq('expected_month', month).limit(300),
    supabase.from('follow_tasks').select('*, customers(full_name,parent_name,child_name,service_type,status)').eq('status', 'open').lte('due_date', today).order('due_date', { ascending: true }).limit(120),
    supabase.from('calendar_sync_sources').select('*').gte('starts_at', `${today}T00:00:00+09:00`).lt('starts_at', `${tomorrow}T00:00:00+09:00`).order('starts_at', { ascending: true }).limit(80),
    supabase.from('ai_secretary_calendar_usage_candidates').select('*').eq('status', 'pending').order('candidate_date', { ascending: false }).limit(80),
    supabase.from('ai_secretary_contracts').select('amount,monthly_fee,purchase_date,status').gte('purchase_date', month).lt('purchase_date', nextMonth).limit(300),
  ])

  const error = lineResult.error?.message || gmailResult.error?.message || customersResult.error?.message || salesResult.error?.message || tasksResult.error?.message || calendarResult.error?.message || usageCandidateResult.error?.message || contractResult.error?.message || null
  return { error, today, month, lines: (lineResult.data || []) as LineItem[], gmail: (gmailResult.data || []) as GmailItem[], customers: (customersResult.data || []) as Customer[], sales: (salesResult.data || []) as SalesCandidate[], tasksTasks: (tasksResult.data || []) as FollowTask[], calendar: (calendarResult.data || []) as CalendarItem[], usageCandidates: (usageCandidateResult.data || []) as UsageCandidate[], tasks: (contractResult.data || []) as ContractAmount[] }
}

function nameOf(item: { full_name?: string | null; parent_name?: string | null; child_name?: string | null }) { return item.full_name || item.parent_name || item.child_name || 'LINE' }
function lineName(item: LineItem) { return item.customer_full_name || item.customer_parent_name || item.customer_child_name || `${formatDateOnly(item.occurred_at)}のLINE相談` }
function candidateLabel(type: string) { const labels: Record<string, string> = { remaining_1: '残り1回', remaining_2: '残り2回', expiry_30: '期限30日前', expiry_14: '期限14日前', expiry_7: '期限7日前', unused_90: '90日未利用', review_request: 'レビュー依頼候補', ashiwaza_candidate: '足技塾候補', sysc_candidate: 'SYSC候補', kids_school_candidate: 'キッズ候補', private_lesson_reproposal: '個人レッスン再提案候補' }; return labels[type] || type }
function statusLabel(status: string) { const labels: Record<string, string> = { new_inquiry: '新規問い合わせ', trial_scheduling: '体験調整中', trial_booked: '体験予約済み', trial_done: '体験後未フォロー' }; return labels[status] || status }
function serviceLabel(type: string | null) { const labels: Record<string, string> = { private_lesson: '個人レッスン', ashiwaza_dribble: '足技塾', sysc: 'SYSC', kids_school: 'キッズスクール', overseas: '海外', unknown: '未分類' }; return labels[type || 'unknown'] || type || '未分類' }
function formatDateTime(value: string | null | undefined) { if (!value) return '-'; return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
function formatDateOnly(value: string | null | undefined) { if (!value) return '-'; return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit' }).format(new Date(value)) }
function formatYen(value: number) { return `${value.toLocaleString()}円` }
function aiLineDraft(text: string) { const compact = text.replace(/\s+/g, ' ').slice(0, 90); return `ご連絡ありがとうございます。\n内容確認しました。\n「${compact}」について確認して、改めてご案内いたします。\n谷田部` }
function aiMailDraft(subject: string | null) { return `お問い合わせありがとうございます。\n${subject ? `「${subject}」の件、` : ''}内容を確認しました。\n詳細を確認のうえ、改めてご連絡いたします。\n谷田部` }
function nextActionForCandidate(type: string) { if (type === 'remaining_1' || type === 'remaining_2') return '継続回数券の提案'; if (type.startsWith('expiry_')) return '期限前フォロー'; if (type === 'unused_90') return '近況確認と再開提案'; if (type === 'review_request') return 'レビュー依頼'; if (type === 'ashiwaza_candidate') return '足技塾へ誘導'; if (type === 'sysc_candidate') return 'SYSC案内'; if (type === 'kids_school_candidate') return 'キッズ体験案内'; if (type === 'private_lesson_reproposal') return '個人レッスン再提案'; return 'フォロー確認' }
function hrefForCustomer(id: string | null, token: string, fallback = 'dashboard') { return id ? `/admin/ai-secretary/customers/${id}?token=${encodeURIComponent(token)}` : `/admin/ai-secretary/${fallback}?token=${encodeURIComponent(token)}` }

export default async function AiSecretaryDashboardPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const query = await getSearchParams(searchParams)
  const token = valueOf(query.token)
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN
  if (!requiredToken || token !== requiredToken) return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>

  const loaded = await loadDashboard()
  if (loaded.error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">ダッシュボード読み取りエラー: {loaded.error}</div>

  const lines = loaded.lines || []
  const gmail = loaded.gmail || []
  const customers = loaded.customers || []
  const sales = loaded.sales || []
  const tasksTasks = loaded.tasksTasks || []
  const calendar = loaded.calendar || []
  const usageCandidates = loaded.usageCandidates || []
  const tasks = loaded.tasks || []

  const todayTrials = customers.filter((customer) => customer.trial_date === loaded.today || customer.status === 'trial_booked')
  const todayFollow = tasksTasks
  const contractCandidates = sales.filter((item) => ['remaining_1', 'remaining_2', 'private_lesson_reproposal', 'expiry_30', 'expiry_14', 'expiry_7'].includes(item.candidate_type))
  const reviewCandidates = sales.filter((item) => item.candidate_type === 'review_request')
  const ashiwazaCandidates = sales.filter((item) => item.candidate_type === 'ashiwaza_candidate')
  const syscCandidates = sales.filter((item) => item.candidate_type === 'sysc_candidate')
  const kidsCandidates = sales.filter((item) => item.candidate_type === 'kids_school_candidate')
  const expiring = sales.filter((item) => ['expiry_30', 'expiry_14', 'expiry_7'].includes(item.candidate_type))
  const remaining1 = sales.filter((item) => item.candidate_type === 'remaining_1')
  const remaining2 = sales.filter((item) => item.candidate_type === 'remaining_2')
  const unused90 = sales.filter((item) => item.candidate_type === 'unused_90')
  const expiry7 = sales.filter((item) => item.candidate_type === 'expiry_7')
  const expiry14 = sales.filter((item) => item.candidate_type === 'expiry_14')
  const churnRisk = [...unused90, ...sales.filter((item) => ['remaining_1', 'remaining_2'].includes(item.candidate_type) && item.priority === 'high')]
  const monthRevenue = tasks.reduce((sum, item) => sum + (item.amount || item.monthly_fee || 0), 0)
  const monthForecast = sales.reduce((sum, item) => sum + (item.expected_amount || 0), 0)
  const monthFollowCandidates = [...reviewCandidates, ...expiring, ...remaining1, ...remaining2, ...unused90]

  const todayBrief: BriefItem[] = [
    ...lines.slice(0, 2).map((line) => ({ title: `LINE返信: ${lineName(line)}`, detail: line.ai_summary || line.body.slice(0, 70), href: hrefForCustomer(line.customer_id, token, 'inbox'), tone: 'red' as const })),
    ...gmail.slice(0, 1).map((mail) => ({ title: `Gmail返信: ${mail.subject || '件名なし'}`, detail: mail.ai_summary || mail.snippet || '内容確認', href: hrefForCustomer(mail.customer_id, token, 'inbox'), tone: 'yellow' as const })),
    ...todayFollow.slice(0, 2).map((task) => ({ title: `フォロー: ${task.title}`, detail: task.ai_reason || candidateLabel(task.task_type), href: hrefForCustomer(task.customer_id, token, 'tasks'), tone: 'blue' as const })),
  ].slice(0, 3)
  while (todayBrief.length < 3) todayBrief.push({ title: todayBrief.length === 0 ? '未対応LINEを確認' : todayBrief.length === 1 ? '売上候補を確認' : 'フォロー候補を確認', detail: '対象が少ない日でも、朝はここだけ確認すればOKです。', href: `/admin/ai-secretary/${todayBrief.length === 0 ? 'inbox' : todayBrief.length === 1 ? 'tasks' : 'tasks'}?token=${encodeURIComponent(token)}`, tone: 'gray' })
  const weekBrief: BriefItem[] = [
    ...contractCandidates.slice(0, 1).map((item) => ({ title: `契約候補: ${nameOf(item)}`, detail: nextActionForCandidate(item.candidate_type), href: hrefForCustomer(item.customer_id, token, 'tasks'), tone: 'green' as const })),
    ...reviewCandidates.slice(0, 1).map((item) => ({ title: `レビュー依頼: ${nameOf(item)}`, detail: item.ai_reason || '関係性が良い候補です。', href: hrefForCustomer(item.customer_id, token, 'tasks'), tone: 'blue' as const })),
    ...churnRisk.slice(0, 1).map((item) => ({ title: `危険フォロー: ${nameOf(item)}`, detail: candidateLabel(item.candidate_type), href: hrefForCustomer(item.customer_id, token, 'tasks'), tone: 'red' as const })),
  ].slice(0, 3)
  while (weekBrief.length < 3) weekBrief.push({ title: weekBrief.length === 0 ? '契約候補を整理' : weekBrief.length === 1 ? 'レビュー候補を確認' : '危険候補を確認', detail: '今週の営業・フォローの抜けを防ぎます。', href: `/admin/ai-secretary/tasks?token=${encodeURIComponent(token)}`, tone: 'gray' })

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gray-950 p-6 text-white shadow-sm">
        <p className="text-xs font-bold text-green-300">Yatabe OS PhaseY</p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-black">毎朝のAI経営ダッシュボード</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-300">未対応LINE、Gmail、レッスン、体験、フォロー、売上、危険候補をこの1画面に集約しました。</p>
          </div>
          <Link href={`/admin/ai-secretary/customers?token=${encodeURIComponent(token)}`} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-950">顧客検索</Link>
        </div>
      </div>

      <section className="rounded-2xl border border-green-200 bg-green-50 p-5 text-green-950 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-black">AI経営ブリーフ</h3>
            <p className="mt-1 text-sm">朝はまずここ。今日3つ、今週3つだけ見れば動けます。</p>
          </div>
          <p className="rounded-full bg-white px-4 py-2 text-xs font-black">{loaded.today}</p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <BriefList title="今日やること" items={todayBrief} />
          <BriefList title="今週やること" items={weekBrief} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <MiniBrief title="今月売上候補" value={`${sales.length}件 / 予測 ${formatYen(monthForecast)}`} href={`/admin/ai-secretary/tasks?token=${encodeURIComponent(token)}`} />
          <MiniBrief title="今月フォロー候補" value={`${monthFollowCandidates.length}件`} href={`/admin/ai-secretary/tasks?token=${encodeURIComponent(token)}`} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryCard title="今日" tone="red" items={[['未対応LINE', lines.length, 'inbox'], ['未返信Gmail', gmail.length, 'inbox'], ['今日のレッスン', calendar.length, 'today'], ['今日の体験', todayTrials.length, 'today'], ['今日のフォロー', todayFollow.length, 'tasks']]} token={token} />
        <SummaryCard title="今週" tone="blue" items={[['契約候補', contractCandidates.length, 'tasks'], ['レビュー候補', reviewCandidates.length, 'tasks'], ['足技塾候補', ashiwazaCandidates.length, 'tasks'], ['SYSC候補', syscCandidates.length, 'tasks'], ['キッズ候補', kidsCandidates.length, 'tasks']]} token={token} />
        <SummaryCard title="売上" tone="green" items={[['今月売上', formatYen(monthRevenue), 'tasks'], ['今月予測', formatYen(monthForecast), 'tasks'], ['失効候補', expiring.length, 'tasks'], ['残り1回', remaining1.length, 'tasks'], ['残り2回', remaining2.length, 'tasks']]} token={token} />
        <SummaryCard title="危険" tone="yellow" items={[['90日未利用', unused90.length, 'tasks'], ['退会リスク', churnRisk.length, 'tasks'], ['期限7日前', expiry7.length, 'tasks'], ['期限14日前', expiry14.length, 'tasks']]} token={token} />
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div><h3 className="text-lg font-black text-gray-900">今日返すLINE</h3><p className="mt-1 text-xs text-gray-500">返信下書きをコピーしてLINE公式で返信します。自動送信はしません。</p></div>
          <Link href={`/admin/ai-secretary/inbox?token=${encodeURIComponent(token)}`} className="rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white">未対応LINE一覧</Link>
        </div>
        <div className="mt-4 space-y-3">
          {lines.slice(0, 8).map((line) => <LineCard key={line.id} line={line} token={token} />)}
          {lines.length === 0 && <p className="text-sm text-gray-500">未対応LINEはありません。</p>}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <CompactSection title="未返信Gmail" empty="Gmail連携データはまだありません。" href={`/admin/ai-secretary/inbox?token=${encodeURIComponent(token)}`} linkLabel="Inbox">
          {gmail.slice(0, 5).map((mail) => <MailCard key={mail.id} mail={mail} token={token} />)}
        </CompactSection>
        <CompactSection title="今日のレッスン・体験" empty="今日の予定はまだありません。" href={`/admin/ai-secretary/today?token=${encodeURIComponent(token)}`} linkLabel="Today">
          {calendar.slice(0, 5).map((event) => <CalendarCard key={event.id} event={event} />)}
          {todayTrials.slice(0, 5).map((customer) => <CustomerActionCard key={customer.id} customer={customer} token={token} label="体験" />)}
        </CompactSection>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SalesSection title="今週の契約・売上候補" items={contractCandidates.slice(0, 8)} token={token} />
        <SalesSection title="危険・失効候補" items={[...expiry7, ...expiry14, ...unused90].slice(0, 8)} token={token} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FollowSection title="今日のフォロー" items={todayFollow.slice(0, 8)} token={token} />
        <UsageSection title="回数券消化候補" items={usageCandidates.slice(0, 8)} token={token} />
      </div>
    </div>
  )
}

function SummaryCard({ title, items, token, tone }: { title: string; items: Array<[string, number | string, string]>; token: string; tone: 'red' | 'blue' | 'green' | 'yellow' }) {
  const classes = { red: 'border-red-200 bg-red-50 text-red-950', blue: 'border-blue-200 bg-blue-50 text-blue-950', green: 'border-green-200 bg-green-50 text-green-950', yellow: 'border-yellow-200 bg-yellow-50 text-yellow-950' }
  return <section className={`rounded-2xl border p-5 ${classes[tone]}`}><h3 className="text-lg font-black">【{title}】</h3><div className="mt-4 space-y-2">{items.map(([label, value, path]) => <Link key={label} href={`/admin/ai-secretary/${path}?token=${encodeURIComponent(token)}`} className="flex items-center justify-between rounded-xl bg-white/75 px-3 py-2 text-sm font-bold"><span>{label}</span><span className="text-xl font-black">{value}</span></Link>)}</div></section>
}
function BriefList({ title, items }: { title: string; items: BriefItem[] }) { return <div className="rounded-2xl bg-white p-4"><h4 className="font-black text-gray-900">{title}</h4><div className="mt-3 space-y-2">{items.map((item, index) => <Link key={`${item.title}-${index}`} href={item.href} className="block rounded-xl border border-gray-100 bg-gray-50 p-3 hover:border-green-300"><p className="text-sm font-black text-gray-900">{index + 1}. {item.title}</p><p className="mt-1 text-xs leading-5 text-gray-600">{item.detail}</p></Link>)}</div></div> }
function MiniBrief({ title, value, href }: { title: string; value: string; href: string }) { return <Link href={href} className="rounded-xl bg-white p-4"><p className="text-xs font-black text-green-700">{title}</p><p className="mt-1 text-xl font-black text-gray-900">{value}</p></Link> }
function LineCard({ line, token }: { line: LineItem; token: string }) { return <article className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">未対応LINE</span><span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">{line.account_display_name || 'LINE'}</span><span className="text-xs font-bold text-gray-500">{formatDateTime(line.occurred_at)}</span></div><Link href={hrefForCustomer(line.customer_id, token, 'inbox')} className="mt-3 block text-base font-black text-gray-900 hover:text-green-700">{lineName(line)}</Link><p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-3 text-sm leading-7 text-gray-800">{line.body}</p><pre className="mt-2 whitespace-pre-wrap rounded-lg border border-gray-100 bg-white p-3 text-sm leading-7 text-gray-800">{line.ai_reply_draft || aiLineDraft(line.body)}</pre></article> }
function MailCard({ mail, token }: { mail: GmailItem; token: string }) { return <article className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">未返信Gmail</span><span className="text-xs font-bold text-gray-500">{formatDateTime(mail.occurred_at)}</span></div><Link href={hrefForCustomer(mail.customer_id, token, 'inbox')} className="mt-3 block font-black text-gray-900 hover:text-green-700">{mail.subject || '件名なし'}</Link>{mail.snippet && <p className="mt-2 rounded-lg bg-white p-3 text-sm leading-7 text-gray-700">{mail.snippet}</p>}<pre className="mt-2 whitespace-pre-wrap rounded-lg border border-gray-100 bg-white p-3 text-sm leading-7 text-gray-800">{mail.ai_reply_draft || aiMailDraft(mail.subject)}</pre></article> }
function CalendarCard({ event }: { event: CalendarItem }) { return <article className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">{event.status || 'scheduled'}</span><span className="text-xs font-bold text-gray-500">{formatDateTime(event.starts_at)}</span>{event.ticket_usage_candidate && <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">回数券消化候補</span>}</div><p className="mt-3 font-black text-gray-900">{event.title || '予定'}</p></article> }
function CustomerActionCard({ customer, token, label }: { customer: Customer; token: string; label: string }) { return <Link href={hrefForCustomer(customer.id, token, 'customers')} className="block rounded-xl border border-gray-100 bg-gray-50 p-4 hover:border-green-300"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">{label}</span><span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">{serviceLabel(customer.service_type)}</span></div><p className="mt-3 font-black text-gray-900">{nameOf(customer)}</p><p className="mt-1 text-xs font-bold text-gray-500">{statusLabel(customer.status)}</p></Link> }
function SalesSection({ title, items, token }: { title: string; items: SalesCandidate[]; token: string }) { return <CompactSection title={title} empty="対象はありません。" href={`/admin/ai-secretary/tasks?token=${encodeURIComponent(token)}`} linkLabel="売上候補"><>{items.map((item, index) => <Link key={`${item.customer_id}-${item.candidate_type}-${index}`} href={hrefForCustomer(item.customer_id, token, 'tasks')} className="block rounded-xl border border-gray-100 bg-gray-50 p-4 hover:border-green-300"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">{candidateLabel(item.candidate_type)}</span><span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">{item.priority}</span>{item.remaining_count !== null && <span className="text-xs font-bold text-gray-500">残{item.remaining_count}回</span>}</div><p className="mt-3 font-black text-gray-900">{nameOf(item)}</p><p className="mt-1 text-xs font-bold text-gray-500">次にやること: {nextActionForCandidate(item.candidate_type)}</p>{item.ai_reason && <p className="mt-2 text-sm leading-6 text-gray-700">{item.ai_reason}</p>}</Link>)}</></CompactSection> }
function FollowSection({ title, items, token }: { title: string; items: FollowTask[]; token: string }) { return <CompactSection title={title} empty="対象はありません。" href={`/admin/ai-secretary/tasks?token=${encodeURIComponent(token)}`} linkLabel="フォロー"><>{items.map((item) => <Link key={item.id} href={hrefForCustomer(item.customer_id, token, 'tasks')} className="block rounded-xl border border-gray-100 bg-gray-50 p-4 hover:border-green-300"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">{candidateLabel(item.task_type)}</span><span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">{item.priority}</span><span className="text-xs font-bold text-gray-500">期限 {formatDateOnly(item.due_date)}</span></div><p className="mt-3 font-black text-gray-900">{nameOf(item.customers || {})}</p><p className="mt-1 text-xs font-bold text-gray-500">{item.title}</p>{item.ai_reason && <p className="mt-2 text-sm leading-6 text-gray-700">{item.ai_reason}</p>}</Link>)}</></CompactSection> }
function UsageSection({ title, items, token }: { title: string; items: UsageCandidate[]; token: string }) { return <CompactSection title={title} empty="確認待ちの消化候補はありません。" href={`/admin/ai-secretary/tasks?token=${encodeURIComponent(token)}`} linkLabel="回数券"><>{items.map((item) => <Link key={item.id} href={hrefForCustomer(item.customer_id, token, 'tasks')} className="block rounded-xl border border-gray-100 bg-gray-50 p-4 hover:border-green-300"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">確認待ち</span><span className="text-xs font-bold text-gray-500">{item.candidate_date}</span><span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">{item.suggested_used_count}回候補</span></div><p className="mt-3 font-black text-gray-900">{nameOf(item)}</p><p className="mt-1 text-sm text-gray-700">{item.lesson_title || 'カレンダー予定'}</p>{item.ai_reason && <p className="mt-2 text-sm leading-6 text-gray-700">{item.ai_reason}</p>}</Link>)}</></CompactSection> }
function CompactSection({ title, children, empty, href, linkLabel }: { title: string; children: React.ReactNode; empty: string; href: string; linkLabel: string }) { const hasChildren = Array.isArray(children) ? children.length > 0 : true; return <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-black text-gray-900">{title}</h3><Link href={href} className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700">{linkLabel}</Link></div><div className="mt-4 space-y-3">{children}{!hasChildren && <p className="text-sm text-gray-500">{empty}</p>}</div></section> }
