import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { StaffCheckCopyButton, StaffNotifyButton } from '@/components/ai-secretary/StaffCheckActions'

type SearchParams = Record<string, string | string[] | undefined>

type LineItem = {
  id: number
  customer_id: string | null
  account_key: string | null
  account_display_name: string | null
  line_user_id: string | null
  line_display_name?: string | null
  body: string
  intent: string | null
  ai_summary: string | null
  ai_reply_draft: string | null
  occurred_at: string
  customer_full_name: string | null
  customer_parent_name: string | null
  customer_child_name: string | null
  service_category: string | null
  status: string
}

type CustomerLineAccountRow = {
  account_key: string
  line_user_id: string
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

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function isScheduleMessage(item: LineItem) {
  const text = `${item.intent || ''}\n${item.ai_summary || ''}\n${item.body || ''}`
  return /(booking|日程|予定|予約|候補|何時|何曜日|月曜|火曜|水曜|木曜|金曜|土曜|日曜|午前|午後|時|場所|代々木|芝浦|青山|公園|レッスン)/.test(text)
}

function displayName(item: LineItem) {
  return (
    item.line_display_name ||
    item.customer_full_name ||
    item.customer_parent_name ||
    item.customer_child_name ||
    inferNameFromText(item.body) ||
    `${formatDate(item.occurred_at)}のLINE相談`
  )
}

function inferNameFromText(text: string) {
  const patterns = [
    /([一-龥ぁ-んァ-ンA-Za-z]{2,12})です[。！!\s\n]/,
    /([一-龥ぁ-んァ-ンA-Za-z]{2,12})\s*$/,
    /子ども[:：]\s*([一-龥ぁ-んァ-ンA-Za-z]{2,12})/,
    /お子様[:：]\s*([一-龥ぁ-んァ-ンA-Za-z]{2,12})/,
  ]
  for (const pattern of patterns) {
    const value = text.match(pattern)?.[1]?.trim()
    if (value && !/(お願い|ありがとう|よろしく|ございます|できます|しました|ください|候補|日程|予定)/.test(value)) return value
  }
  return null
}

function staffQuestion(item: LineItem) {
  const name = displayName(item)
  const compactBody = item.body.replace(/\s+/g, ' ').slice(0, 260)
  return `【日程確認依頼】

顧客: ${name}
LINE公式: ${item.account_display_name || item.account_key || 'LINE'}
受信: ${formatDate(item.occurred_at)}

保護者から日程相談が来ています。

内容:
${compactBody}

確認してほしいこと:
・対応可能な候補日時
・場所
・担当可能か
・注意点があれば一言

以下だけ返信してください。

候補:
不可:
場所:
補足:`
}

function yatabeReplySkeleton(item: LineItem) {
  const name = displayName(item)
  return `ご連絡ありがとうございます。

日程を確認して、候補を整理してご案内いたします。

確認でき次第、曜日と時間、場所を含めて改めてご連絡いたします。

谷田部

---
内部確認対象: ${name}
スタッフから候補が戻ったら、ここに候補日時を入れて返信文を完成させる。`
}

async function loadScheduleChecks() {
  const supabase = getServiceClient()
  if (!supabase) return { items: [] as LineItem[], error: 'supabase_not_configured' }

  const { data, error } = await supabase
    .from('ai_secretary_line_inbox')
    .select('*')
    .eq('status', 'needs_review')
    .order('occurred_at', { ascending: false })
    .limit(120)

  if (error) return { items: [] as LineItem[], error: error.message }

  const rows = ((data || []) as LineItem[]).filter(isScheduleMessage)
  const accountKeys = [...new Set(rows.map((item) => item.account_key).filter(Boolean))] as string[]
  const lineUserIds = [...new Set(rows.map((item) => item.line_user_id).filter(Boolean))] as string[]
  const displayNameMap = new Map<string, string>()

  if (accountKeys.length > 0 && lineUserIds.length > 0) {
    const { data: lineAccounts } = await supabase
      .from('customer_line_accounts')
      .select('account_key,line_user_id,display_name')
      .in('account_key', accountKeys)
      .in('line_user_id', lineUserIds)

    for (const account of (lineAccounts || []) as CustomerLineAccountRow[]) {
      if (account.display_name && !/^LINEアカウント-/.test(account.display_name)) {
        displayNameMap.set(`${account.account_key}:${account.line_user_id}`, account.display_name)
      }
    }
  }

  const items = rows.map((item) => ({
    ...item,
    line_display_name: item.account_key && item.line_user_id ? displayNameMap.get(`${item.account_key}:${item.line_user_id}`) || item.line_display_name || null : item.line_display_name || null,
  }))

  return { items, error: null }
}

export default async function StaffChecksPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const params = await getSearchParams(searchParams)
  const token = valueOf(params.token)
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN

  if (!requiredToken || token !== requiredToken) {
    return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>
  }

  const { items, error } = await loadScheduleChecks()

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-gray-950 p-6 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold text-green-300">Yatabe Daily OS</p>
            <h2 className="mt-1 text-3xl font-black">スタッフ確認</h2>
            <p className="mt-2 text-sm leading-7 text-gray-300">
              スタッフには返信文を書かせず、候補日時・場所・補足だけ確認します。顧客への自動送信はしません。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/ai-secretary/morning?token=${encodeURIComponent(token)}`} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-950">Morningへ</Link>
            <Link href={`/admin/ai-secretary/line-inbox?token=${encodeURIComponent(token)}`} className="rounded-full border border-white/30 px-4 py-2 text-sm font-bold text-white">未対応LINEへ</Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <CountCard label="日程確認候補" value={items.length} />
        <CountCard label="谷田部がやること" value={1} suffix="クリック/件" />
        <CountCard label="顧客送信" value={0} suffix="自動送信なし" />
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">読み取りエラー: {error}</div>}

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <h3 className="font-black text-blue-950">使い方</h3>
        <p className="mt-2 text-sm leading-7 text-blue-900">
          各カードの「スタッフ確認文をコピー」を押してスタッフLINEに貼るだけです。スタッフには「候補・不可・場所・補足」だけ返してもらいます。
          戻ってきた内容を下書きに反映して、顧客へ送る前に谷田部さんが確認します。
        </p>
      </section>

      <div className="space-y-4">
        {items.map((item) => {
          const question = staffQuestion(item)
          const draft = item.ai_reply_draft || yatabeReplySkeleton(item)
          return (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 bg-gray-50 p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2 text-xs font-bold">
                      <span className="rounded-full bg-red-100 px-2 py-1 text-red-700">未対応</span>
                      <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">{item.account_display_name || item.account_key || 'LINE'}</span>
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">日程調整候補</span>
                    </div>
                    <h3 className="mt-3 text-xl font-black text-gray-950">{displayName(item)}</h3>
                    <p className="mt-1 text-xs font-bold text-gray-500">受信: {formatDate(item.occurred_at)}</p>
                  </div>
                  {item.customer_id && (
                    <Link href={`/admin/ai-secretary/customers/${item.customer_id}?token=${encodeURIComponent(token)}`} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700">
                      顧客を開く
                    </Link>
                  )}
                </div>
              </div>

              <div className="grid gap-0 lg:grid-cols-2">
                <section className="space-y-3 p-5">
                  <h4 className="text-sm font-black text-gray-900">LINE内容</h4>
                  <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-7 text-gray-800">{item.ai_summary || item.body}</p>
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-black text-gray-900">スタッフ確認文</h4>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <StaffNotifyButton lineInboxId={item.id} token={token} />
                      <StaffCheckCopyButton text={question} label="コピー" />
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm leading-7 text-gray-900">{question}</pre>
                </section>

                <section className="space-y-3 border-t border-gray-100 bg-gray-50 p-5 lg:border-l lg:border-t-0">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-black text-gray-900">保護者向け返信下書き</h4>
                    <StaffCheckCopyButton text={draft} label="下書きをコピー" />
                  </div>
                  <pre className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm leading-7 text-gray-900">{draft}</pre>
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm leading-7 text-yellow-900">
                    ルール: スタッフ返信だけで日程確定しない。回数券・料金・退会・クレームは谷田部確認。
                  </div>
                </section>
              </div>
            </article>
          )
        })}

        {items.length === 0 && !error && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="font-bold text-gray-800">日程調整のスタッフ確認候補はありません。</p>
          </div>
        )}
      </div>
    </div>
  )
}

function CountCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-gray-900">{value}</p>
      {suffix && <p className="mt-1 text-xs font-bold text-gray-500">{suffix}</p>}
    </div>
  )
}
