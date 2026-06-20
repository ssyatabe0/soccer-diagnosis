import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { CaseRecordActions } from '@/components/ai-secretary/CaseRecordActions'
import { CaseContentGenerateButton } from '@/components/ai-secretary/CaseContentGenerateButton'

type SearchParams = Record<string, string | string[] | undefined>

type CaseAsset = {
  id: string
  case_code: string | null
  customer_id: string | null
  full_name: string | null
  parent_name: string | null
  child_name: string | null
  problem: string | null
  cause: string | null
  improvement: string | null
  result: string | null
  publish_status: string
  country: string | null
  region: string | null
  tags: string[] | null
  video_count: number | null
  created_at: string
}

type Customer = { id: string; full_name: string | null; parent_name: string | null; child_name: string | null }

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

async function loadData() {
  const supabase = getServiceClient()
  if (!supabase) return { cases: [] as CaseAsset[], customers: [] as Customer[], error: 'supabase_not_configured' }
  const [{ data: cases, error: casesError }, { data: customers, error: customersError }] = await Promise.all([
    supabase.from('ai_secretary_case_assets').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('customers').select('id,full_name,parent_name,child_name').order('last_contact_at', { ascending: false, nullsFirst: false }).limit(500),
  ])
  return { cases: (cases || []) as CaseAsset[], customers: (customers || []) as Customer[], error: casesError?.message || customersError?.message || null }
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
}

function displayName(item: CaseAsset) {
  return item.child_name || item.full_name || item.parent_name || item.case_code || '顧客未紐付け'
}

export default async function AiSecretaryCasesPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const params = await getSearchParams(searchParams)
  const token = valueOf(params.token)
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN
  if (!requiredToken || token !== requiredToken) return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>
  const { cases, customers, error } = await loadData()

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold text-green-700">Yatabe AI Secretary Phase9</p>
          <h2 className="text-2xl font-black text-gray-900">症例DB</h2>
          <p className="mt-1 text-sm text-gray-500">悩み、原因、改善、結果を顧客と紐付けて保存します。公開はしません。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/ai-secretary/case-search?token=${encodeURIComponent(token)}`} className="rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white">症例検索へ</Link>
          <Link href={`/admin/ai-secretary/videos?token=${encodeURIComponent(token)}`} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700">動画DBへ</Link>
        </div>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Supabase読み取りエラー: {error}</div>}
      <CaseRecordActions token={token} customers={customers} cases={cases} />
      <div className="grid gap-3">
        {cases.map((item) => (
          <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{item.publish_status}</span>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">動画 {item.video_count || 0}件</span>
                  <span className="text-xs font-bold text-gray-500">作成 {formatDate(item.created_at)}</span>
                </div>
                <h3 className="mt-3 text-lg font-black text-gray-900">{displayName(item)}</h3>
                <p className="mt-1 text-sm text-gray-500">{item.country || '-'} / {item.region || '-'} / {(item.tags || []).join(', ') || 'タグなし'}</p>
              </div>
              {item.customer_id && <Link href={`/admin/ai-secretary/customers/${item.customer_id}?token=${encodeURIComponent(token)}`} className="rounded-full border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700">顧客詳細</Link>}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Block label="悩み" value={item.problem} />
              <Block label="原因" value={item.cause} />
              <Block label="改善内容" value={item.improvement} />
              <Block label="結果" value={item.result} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <CaseContentGenerateButton token={token} caseId={item.id} contentType="blog_draft" label="ブログ下書き生成" />
              <CaseContentGenerateButton token={token} caseId={item.id} contentType="seo_article" label="SEO記事生成" />
              <CaseContentGenerateButton token={token} caseId={item.id} contentType="sns_post" label="SNS文生成" />
            </div>
          </article>
        ))}
        {cases.length === 0 && <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">症例カルテはまだありません。</div>}
      </div>
    </div>
  )
}

function Block({ label, value }: { label: string; value: string | null }) {
  return <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs font-black text-gray-500">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-800">{value || '-'}</p></div>
}
