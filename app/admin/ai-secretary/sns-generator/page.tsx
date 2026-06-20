import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { CaseContentGenerateButton } from '@/components/ai-secretary/CaseContentGenerateButton'

type SearchParams = Record<string, string | string[] | undefined>
type CaseAsset = { id: string; customer_id: string | null; case_code: string | null; full_name: string | null; parent_name: string | null; child_name: string | null; problem: string | null; result: string | null }
type Content = { id: string; content_type: string; title: string; body: string; status: string; created_at: string }

function getServiceClient() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key || url.includes('placeholder')) return null; return createClient(url.replace(/\/+$/, ''), key) }
function valueOf(value: string | string[] | undefined, fallback = '') { return Array.isArray(value) ? value[0] || fallback : value || fallback }
async function getSearchParams(input: Promise<SearchParams> | SearchParams | undefined) { return input ? await Promise.resolve(input) : {} }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '-' }
function nameOf(item: CaseAsset) { return item.child_name || item.full_name || item.parent_name || item.case_code || '症例カルテ' }

async function loadData() {
  const supabase = getServiceClient()
  if (!supabase) return { cases: [] as CaseAsset[], contents: [] as Content[], error: 'supabase_not_configured' }
  const [cases, contents] = await Promise.all([
    supabase.from('ai_secretary_case_assets').select('id,customer_id,case_code,full_name,parent_name,child_name,problem,result').order('created_at', { ascending: false }).limit(200),
    supabase.from('generated_contents').select('*').in('content_type', ['sns_post', 'video_description', 'youtube_title', 'thumbnail_idea']).order('created_at', { ascending: false }).limit(100),
  ])
  return { cases: (cases.data || []) as CaseAsset[], contents: (contents.data || []) as Content[], error: cases.error?.message || contents.error?.message || null }
}

export default async function AiSecretarySnsGeneratorPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const params = await getSearchParams(searchParams)
  const token = valueOf(params.token)
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN
  if (!requiredToken || token !== requiredToken) return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>
  const { cases, contents, error } = await loadData()

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold text-green-700">Yatabe AI Secretary Phase9</p>
          <h2 className="text-2xl font-black text-gray-900">AI SNS・動画生成支援</h2>
          <p className="mt-1 text-sm text-gray-500">症例からSNS文、動画説明文、サムネ案を作ります。投稿はしません。</p>
        </div>
        <Link href={`/admin/ai-secretary/videos?token=${encodeURIComponent(token)}`} className="rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white">動画DBへ</Link>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Supabase読み取りエラー: {error}</div>}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">症例から生成</h3>
        <div className="mt-4 grid gap-3">
          {cases.map((item) => <article key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h4 className="font-black text-gray-900">{nameOf(item)}</h4><p className="mt-2 text-sm leading-7 text-gray-700">{item.problem || item.result || '-'}</p></div><div className="flex flex-wrap gap-2"><CaseContentGenerateButton token={token} caseId={item.id} contentType="sns_post" label="SNS投稿文" /><CaseContentGenerateButton token={token} caseId={item.id} contentType="video_description" label="動画説明文" /><CaseContentGenerateButton token={token} caseId={item.id} contentType="thumbnail_idea" label="サムネ案" /></div></div></article>)}
          {cases.length === 0 && <p className="text-sm text-gray-500">症例カルテがまだありません。</p>}
        </div>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">生成済みSNS・動画素材</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {contents.map((content) => <article key={content.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{content.content_type}</span><span className="text-xs font-bold text-gray-500">{formatDate(content.created_at)}</span></div><h4 className="mt-3 font-black text-gray-900">{content.title}</h4><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-4 text-sm leading-7 text-gray-800">{content.body}</pre></article>)}
          {contents.length === 0 && <p className="text-sm text-gray-500 md:col-span-2">生成済み素材はまだありません。</p>}
        </div>
      </section>
    </div>
  )
}
