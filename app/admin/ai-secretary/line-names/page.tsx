import { createClient } from '@supabase/supabase-js'
import { inferLineDisplayNameFromText, isSyntheticLineDisplayName } from '@/lib/ai-secretary/line-name-inference'

type SearchParams = Record<string, string | string[] | undefined>

type LineAccountRow = {
  customer_id: string
  account_key: string
  line_user_id: string
  display_name: string | null
  first_seen_at: string | null
  last_seen_at: string | null
}

type LineMessageRow = {
  customer_id: string | null
  account_key: string | null
  line_user_id: string | null
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

function valueOf(value: string | string[] | undefined, fallback = '') {
  if (Array.isArray(value)) return value[0] || fallback
  return value || fallback
}

async function getSearchParams(input: Promise<SearchParams> | SearchParams | undefined) {
  return input ? await Promise.resolve(input) : {}
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function isSyntheticName(value: string | null | undefined) {
  return isSyntheticLineDisplayName(value)
}

function visibleName(item: LineAccountRow & { latest?: LineMessageRow }) {
  if (!isSyntheticName(item.display_name)) return item.display_name || ''
  return inferLineDisplayNameFromText(item.latest?.body, item.latest?.ai_summary) || `LINEアカウント-${item.line_user_id.slice(-6)}`
}

async function loadItems(showAll: boolean) {
  const supabase = getServiceClient()
  if (!supabase) return { items: [] as Array<LineAccountRow & { latest?: LineMessageRow }>, error: 'supabase_not_configured' }

  const { data: accounts, error: accountError } = await supabase
    .from('customer_line_accounts')
    .select('customer_id,account_key,line_user_id,display_name,first_seen_at,last_seen_at')
    .order('last_seen_at', { ascending: false, nullsFirst: false })
    .limit(200)

  if (accountError) return { items: [] as Array<LineAccountRow & { latest?: LineMessageRow }>, error: accountError.message }

  const rows = ((accounts || []) as LineAccountRow[]).filter((row) => showAll || isSyntheticName(row.display_name))
  const customerIds = [...new Set(rows.map((row) => row.customer_id).filter(Boolean))]
  if (customerIds.length === 0) return { items: rows, error: null }

  const { data: messages, error: messageError } = await supabase
    .from('line_messages')
    .select('customer_id,account_key,line_user_id,body,ai_summary,occurred_at')
    .in('customer_id', customerIds)
    .order('occurred_at', { ascending: false })
    .limit(Math.min(customerIds.length * 20, 3000))

  if (messageError) return { items: rows, error: messageError.message }

  const latestByAccount = new Map<string, LineMessageRow>()
  for (const message of (messages || []) as LineMessageRow[]) {
    const key = `${message.account_key || ''}:${message.line_user_id || ''}`
    if (!latestByAccount.has(key)) latestByAccount.set(key, message)
  }

  return {
    items: rows.map((row) => ({ ...row, latest: latestByAccount.get(`${row.account_key}:${row.line_user_id}`) })),
    error: null,
  }
}

export default async function LineNamesPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const params = await getSearchParams(searchParams)
  const token = valueOf(params.token)
  const showAll = valueOf(params.all) === '1'
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN

  if (!requiredToken || token !== requiredToken) {
    return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>
  }

  const { items, error } = await loadItems(showAll)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-xs font-black text-emerald-700">LINE Name Recovery</p>
        <h2 className="mt-1 text-2xl font-black text-gray-900">LINE表示名の復旧</h2>
        <p className="mt-2 text-sm leading-7 text-gray-700">
          LINE APIで実名取得できないアカウントを、LINE Official Account Managerのチャット一覧と照合して表示名を入れる画面です。
          送信はしません。名前だけを保存します。
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
          <a href={`/admin/ai-secretary/customers?token=${encodeURIComponent(token)}`} className="rounded-full bg-white px-3 py-2 text-gray-700 ring-1 ring-emerald-200">顧客へ戻る</a>
          <a href={`/admin/ai-secretary/line-names?token=${encodeURIComponent(token)}&all=${showAll ? '0' : '1'}`} className="rounded-full bg-gray-900 px-3 py-2 text-white">{showAll ? '未取得だけ表示' : '全LINE表示名を見る'}</a>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">読み取りエラー: {error}</div>}

      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
        <p className="font-black text-gray-900">使い方</p>
        <p className="mt-2">1. LINE Official Account Managerのチャット一覧で相手の表示名を見る。</p>
        <p>2. この画面の「最新メッセージ」「最終日時」が近い行を見つける。</p>
        <p>3. 下のAPIに表示名を保存する。今後は顧客一覧にその名前が出ます。</p>
        <pre className="mt-3 overflow-auto rounded-xl bg-gray-950 p-3 text-xs text-gray-100">{`PATCH /api/ai-secretary/line-profiles/name-candidates?token=...
{
  "items": [
    {
      "account_key": "soccer_private_lesson",
      "line_user_id": "この画面に表示されるID",
      "display_name": "LINE管理画面の相手名"
    }
  ]
}`}</pre>
      </div>

      <div className="grid gap-3">
        {items.map((item) => (
          <article key={`${item.account_key}:${item.line_user_id}`} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">{item.account_key}</span>
                  <span className={`rounded-full px-3 py-1 ${isSyntheticName(item.display_name) ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{isSyntheticName(item.display_name) ? '名前要復旧' : '名前あり'}</span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">末尾 {item.line_user_id.slice(-8)}</span>
                </div>
                <h3 className="mt-3 text-lg font-black text-gray-900">{visibleName(item)}</h3>
                {isSyntheticName(item.display_name) && visibleName(item).startsWith('LINEアカウント-') === false && <p className="mt-1 text-xs font-bold text-orange-700">本文から暫定表示: {visibleName(item)}</p>}
                <p className="mt-2 text-xs font-bold text-gray-500">line_user_id: <span className="select-all">{item.line_user_id}</span></p>
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-sm leading-7 text-gray-700">{item.latest?.body || item.latest?.ai_summary || 'メッセージ本文なし'}</p>
              </div>
              <div className="shrink-0 text-left text-xs text-gray-500 md:text-right">
                <div>初回: {formatDateTime(item.first_seen_at)}</div>
                <div className="mt-1">最終: {formatDateTime(item.last_seen_at)}</div>
                <div className="mt-1">最新本文: {formatDateTime(item.latest?.occurred_at)}</div>
              </div>
            </div>
          </article>
        ))}
        {items.length === 0 && !error && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">名前復旧が必要なLINEアカウントはありません。</div>
        )}
      </div>
    </div>
  )
}
