import Link from 'next/link'

type SearchParams = Record<string, string | string[] | undefined>

function valueOf(value: string | string[] | undefined, fallback = '') {
  if (Array.isArray(value)) return value[0] || fallback
  return value || fallback
}

async function getSearchParams(input: Promise<SearchParams> | SearchParams | undefined) {
  return input ? await Promise.resolve(input) : {}
}

async function search(token: string, q: string) {
  if (!q) return { count: 0, items: [], mode: 'empty' }
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://soccer-diagnosis.vercel.app'
  const response = await fetch(`${base}/api/ai-secretary/search?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!response.ok) return { count: 0, items: [], mode: 'error', error: await response.text() }
  return response.json()
}

function nameOf(item: Record<string, unknown>) {
  const customer = typeof item.customers === 'object' && item.customers !== null ? item.customers as Record<string, unknown> : {}
  return String(item.full_name || item.parent_name || item.child_name || customer.full_name || customer.parent_name || customer.child_name || '名称未設定')
}

export default async function AiSecretarySearchPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const params = await getSearchParams(searchParams)
  const token = valueOf(params.token)
  const q = valueOf(params.q)
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN
  if (!requiredToken || token !== requiredToken) return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>

  const result = await search(token, q)

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold text-green-700">Yatabe AI Secretary Phase5</p>
        <h2 className="text-2xl font-black text-gray-900">自然文検索</h2>
        <p className="mt-1 text-sm text-gray-500">例: グアムの兄弟 / MLS NEXTの子 / レビュー依頼できる人 / 今月売上になりそうな人</p>
      </div>
      <form className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 md:grid-cols-[1fr_auto]">
        <input type="hidden" name="token" value={token} />
        <input name="q" defaultValue={q} placeholder="自然文で検索" className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
        <button className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white">検索</button>
      </form>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">検索結果 {result.count || 0}件</h3>
        <div className="mt-4 space-y-3">
          {(result.items || []).map((item: Record<string, unknown>, index: number) => {
            const customerId = String(item.customer_id || item.id || '')
            return (
              <Link key={`${customerId}-${index}`} href={customerId ? `/admin/ai-secretary/customers/${customerId}?token=${encodeURIComponent(token)}` : '#'} className="block rounded-xl border border-gray-100 bg-gray-50 p-4 hover:border-green-300">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">{String(item.candidate_type || item.service_type || item.event_type || result.mode)}</span>
                  {item.customer_service_type && <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">{String(item.customer_service_type)}</span>}
                </div>
                <p className="mt-3 font-black text-gray-900">{nameOf(item)}</p>
                <p className="mt-2 text-sm leading-6 text-gray-700">{String(item.ai_reason || item.memo || item.body || item.title || '')}</p>
              </Link>
            )
          })}
          {!q && <p className="text-sm text-gray-500">検索語を入力してください。</p>}
          {q && (result.items || []).length === 0 && <p className="text-sm text-gray-500">該当なし。履歴取り込みが増えるほど検索精度が上がります。</p>}
        </div>
      </section>
    </div>
  )
}
