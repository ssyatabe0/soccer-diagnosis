import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

type SearchParams = Record<string, string | string[] | undefined>

type SalesCandidate = {
  customer_id: string
  full_name: string | null
  parent_name: string | null
  child_name: string | null
  customer_service_type: string | null
  customer_status: string | null
  contract_id: string | null
  candidate_type: string
  product_name: string | null
  remaining_count: number | null
  effective_valid_until: string | null
  expected_amount: number | null
  expected_month: string | null
  priority: string
  ai_reason: string | null
}

type FollowTask = {
  id?: number
  customer_id: string
  candidate_type?: string
  task_type?: string
  title?: string
  due_date?: string | null
  priority?: string
  ai_reason?: string | null
  customers?: {
    full_name: string | null
    parent_name: string | null
    child_name: string | null
    service_type: string | null
    status: string | null
  } | null
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

function currentMonthStart() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

async function loadSales(month: string) {
  const supabase = getServiceClient()
  if (!supabase) return { candidates: [] as SalesCandidate[], followTasks: [] as FollowTask[], error: 'supabase_not_configured' }

  const next = new Date(month + 'T00:00:00.000Z')
  next.setUTCMonth(next.getUTCMonth() + 1)
  const nextMonth = next.toISOString().slice(0, 10)

  const [{ data: candidates, error: candidatesError }, { data: followTasks, error: followError }] = await Promise.all([
    supabase.from('ai_secretary_sales_candidates').select('*').eq('expected_month', month).limit(300),
    supabase
      .from('follow_tasks')
      .select('*, customers(full_name,parent_name,child_name,service_type,status)')
      .eq('status', 'open')
      .gte('due_date', month)
      .lt('due_date', nextMonth)
      .order('due_date', { ascending: true })
      .limit(200),
  ])

  return {
    candidates: (candidates || []) as SalesCandidate[],
    followTasks: (followTasks || []) as FollowTask[],
    error: candidatesError?.message || followError?.message || null,
  }
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

function customerName(item: Pick<SalesCandidate, 'full_name' | 'parent_name' | 'child_name'>) {
  return item.full_name || item.parent_name || item.child_name || 'LINE'
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
}

function priorityClass(priority: string | undefined) {
  if (priority === 'high') return 'bg-red-100 text-red-700'
  if (priority === 'low') return 'bg-gray-100 text-gray-600'
  return 'bg-yellow-100 text-yellow-700'
}

export default async function AiSecretaryRevenuePage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const query = await getSearchParams(searchParams)
  const token = valueOf(query.token)
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN
  const month = valueOf(query.month, currentMonthStart())

  if (!requiredToken || token !== requiredToken) {
    return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>
  }

  const { candidates, followTasks, error } = await loadSales(month)
  const expiring = candidates.filter((item) => ['expiry_30', 'expiry_14', 'expiry_7'].includes(item.candidate_type))
  const revenue = candidates.filter((item) => !['review_request'].includes(item.candidate_type))
  const follow = [
    ...candidates.filter((item) => ['remaining_1', 'remaining_2', 'unused_90', 'review_request', 'ashiwaza_candidate', 'sysc_candidate', 'private_lesson_reproposal'].includes(item.candidate_type)),
    ...followTasks,
  ]

  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">売上管理読み取りエラー: {error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold text-green-700">Yatabe AI Secretary Phase3</p>
          <h2 className="text-2xl font-black text-gray-900">売上候補一覧</h2>
          <p className="mt-1 text-sm text-gray-500">回数券・期限・未利用・再提案候補を見て、今月動くべき相手を絞ります。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/ai-secretary/today-sales?token=${encodeURIComponent(token)}`} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700">今日の営業へ</Link>
          <Link href={`/admin/ai-secretary/reviews?token=${encodeURIComponent(token)}`} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700">レビュー候補へ</Link>
          <Link href={`/admin/ai-secretary/churn-risk?token=${encodeURIComponent(token)}`} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700">退会防止へ</Link>
          <Link href={`/admin/ai-secretary/customers?token=${encodeURIComponent(token)}`} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700">顧客マスタへ</Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Kpi label="今月売上候補" value={revenue.length} tone="green" />
        <Kpi label="今月失効候補" value={expiring.length} tone="red" />
        <Kpi label="今月フォロー対象" value={follow.length} tone="yellow" />
      </div>

      <CandidateSection title="今月売上候補" items={revenue} token={token} />
      <CandidateSection title="今月失効候補" items={expiring} token={token} />
      <FollowSection title="今月フォロー対象" items={follow} token={token} />
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: 'green' | 'red' | 'yellow' }) {
  const classes = {
    green: 'border-green-200 bg-green-50 text-green-900',
    red: 'border-red-200 bg-red-50 text-red-900',
    yellow: 'border-yellow-200 bg-yellow-50 text-yellow-900',
  }
  return (
    <div className={`rounded-2xl border p-5 ${classes[tone]}`}>
      <p className="text-xs font-bold opacity-70">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
    </div>
  )
}

function CandidateSection({ title, items, token }: { title: string; items: SalesCandidate[]; token: string }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-gray-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div key={`${item.customer_id}-${item.candidate_type}-${item.contract_id || index}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${priorityClass(item.priority)}`}>{item.priority}</span>
              <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">{candidateLabel(item.candidate_type)}</span>
              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">{serviceLabel(item.customer_service_type)}</span>
              {item.effective_valid_until && <span className="text-xs font-bold text-gray-500">期限 {formatDate(item.effective_valid_until)}</span>}
              {typeof item.remaining_count === 'number' && <span className="text-xs font-bold text-gray-500">残 {item.remaining_count}回</span>}
            </div>
            <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <Link href={`/admin/ai-secretary/customers/${item.customer_id}?token=${encodeURIComponent(token)}`} className="text-base font-black text-gray-900 hover:text-green-700">
                  {customerName(item)}
                </Link>
                <p className="mt-1 text-xs text-gray-500">{item.product_name || '顧客状況から自動抽出'}</p>
              </div>
              {item.expected_amount !== null && <p className="text-sm font-black text-gray-900">見込 {item.expected_amount.toLocaleString()}円</p>}
            </div>
            {item.ai_reason && <p className="mt-3 rounded-lg bg-white p-3 text-sm leading-7 text-gray-700">{item.ai_reason}</p>}
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-500">対象はまだありません。</p>}
      </div>
    </section>
  )
}

function FollowSection({ title, items, token }: { title: string; items: Array<SalesCandidate | FollowTask>; token: string }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-gray-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => {
          const isTask = 'task_type' in item
          const customerId = item.customer_id
          const type = isTask ? item.task_type || item.candidate_type || 'manual' : item.candidate_type
          const name = isTask
            ? item.customers?.full_name || item.customers?.parent_name || item.customers?.child_name || 'LINE'
            : customerName(item)
          const service = isTask ? item.customers?.service_type || 'unknown' : item.customer_service_type
          return (
            <div key={`${customerId}-${type}-${index}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${priorityClass(item.priority)}`}>{item.priority || 'medium'}</span>
                <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">{candidateLabel(type || 'manual')}</span>
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">{serviceLabel(service)}</span>
                {isTask && item.due_date && <span className="text-xs font-bold text-gray-500">期限 {formatDate(item.due_date)}</span>}
              </div>
              <Link href={`/admin/ai-secretary/customers/${customerId}?token=${encodeURIComponent(token)}`} className="mt-3 block text-base font-black text-gray-900 hover:text-green-700">
                {name}
              </Link>
              {'title' in item && item.title && <p className="mt-1 text-xs font-bold text-gray-500">{item.title}</p>}
              {item.ai_reason && <p className="mt-3 rounded-lg bg-white p-3 text-sm leading-7 text-gray-700">{item.ai_reason}</p>}
            </div>
          )
        })}
        {items.length === 0 && <p className="text-sm text-gray-500">対象はまだありません。</p>}
      </div>
    </section>
  )
}
