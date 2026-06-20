import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { matchesCaseQuery } from '@/lib/ai-secretary/case-content'

type SearchParams = Record<string, string | string[] | undefined>
type CaseAsset = { id: string; customer_id: string | null; case_code: string | null; full_name: string | null; parent_name: string | null; child_name: string | null; problem: string | null; cause: string | null; improvement: string | null; result: string | null; parent_feedback: string | null; country: string | null; region: string | null; position: string | null; tags: string[] | null; publish_status: string; video_count: number | null }
type Video = { id: string; title: string; description: string | null; thumbnail_idea: string | null; sns_caption: string | null; youtube_url: string | null; short_url: string | null; customer_id: string | null }

function getServiceClient() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key || url.includes('placeholder')) return null; return createClient(url.replace(/\/+$/, ''), key) }
function valueOf(value: string | string[] | undefined, fallback = '') { return Array.isArray(value) ? value[0] || fallback : value || fallback }
async function getSearchParams(input: Promise<SearchParams> | SearchParams | undefined) { return input ? await Promise.resolve(input) : {} }
function nameOf(item: CaseAsset) { return item.child_name || item.full_name || item.parent_name || item.case_code || '症例カルテ' }

async function loadResults(q: string) {
  const supabase = getServiceClient()
  if (!supabase) return { cases: [] as CaseAsset[], videos: [] as Video[], error: 'supabase_not_configured' }
  const [{ data: caseRows, error: caseError }, { data: videoRows, error: videoError }] = await Promise.all([
    supabase.from('ai_secretary_case_assets').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('case_videos').select('*').order('created_at', { ascending: false }).limit(500),
  ])
  const query = q.trim().toLowerCase()
  const cases = ((caseRows || []) as CaseAsset[]).filter((item) => !query || matchesCaseQuery(item, query))
  const videos = ((videoRows || []) as Video[]).filter((video) => {
    if (!query) return true
    return [video.title, video.description, video.thumbnail_idea, video.sns_caption, video.youtube_url, video.short_url].filter(Boolean).join(' ').toLowerCase().includes(query)
  })
  return { cases, videos, error: caseError?.message || videoError?.message || null }
}

export default async function AiSecretaryCaseSearchPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const params = await getSearchParams(searchParams)
  const token = valueOf(params.token)
  const q = valueOf(params.q)
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN
  if (!requiredToken || token !== requiredToken) return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>
  const { cases, videos, error } = await loadResults(q)
  const examples = ['ドリブルで抜けない子', 'MLS NEXT', '海外選手', '左利き', 'シュート打てない', '自信がない', '試合で消える']

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold text-green-700">Yatabe AI Secretary Phase9</p>
        <h2 className="text-2xl font-black text-gray-900">AI症例検索</h2>
        <p className="mt-1 text-sm text-gray-500">症例・動画・顧客メモを自然文で探します。</p>
      </div>
      <form className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <input type="hidden" name="token" value={token} />
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input name="q" defaultValue={q} placeholder="例: この子と似た症例 / MLS NEXT / 自信がない" className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
          <button className="rounded-xl bg-gray-900 px-5 py-2 text-sm font-bold text-white">検索</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((example) => <Link key={example} href={`/admin/ai-secretary/case-search?token=${encodeURIComponent(token)}&q=${encodeURIComponent(example)}`} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{example}</Link>)}
        </div>
      </form>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Supabase読み取りエラー: {error}</div>}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">症例結果 {cases.length}件</h3>
        <div className="mt-4 grid gap-3">
          {cases.map((item) => <ResultCard key={item.id} token={token} item={item} />)}
          {cases.length === 0 && <p className="text-sm text-gray-500">該当症例はありません。</p>}
        </div>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">動画結果 {videos.length}件</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {videos.map((video) => <article key={video.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4"><h4 className="font-black text-gray-900">{video.title}</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700">{video.description || video.sns_caption || '-'}</p>{video.youtube_url && <a href={video.youtube_url} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-gray-700">YouTube</a>}</article>)}
          {videos.length === 0 && <p className="text-sm text-gray-500 md:col-span-2">該当動画はありません。</p>}
        </div>
      </section>
    </div>
  )
}

function ResultCard({ item, token }: { item: CaseAsset; token: string }) {
  return <article className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{item.publish_status}</span><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">動画 {item.video_count || 0}件</span>{item.customer_id && <Link href={`/admin/ai-secretary/customers/${item.customer_id}?token=${encodeURIComponent(token)}`} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700">顧客詳細</Link>}</div><h4 className="mt-3 font-black text-gray-900">{nameOf(item)}</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700">{item.problem || '-'}
{item.result || ''}</p></article>
}
