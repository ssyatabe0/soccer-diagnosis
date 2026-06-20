import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { CaseRecordActions } from '@/components/ai-secretary/CaseRecordActions'

type SearchParams = Record<string, string | string[] | undefined>
type Customer = { id: string; full_name: string | null; parent_name: string | null; child_name: string | null }
type CaseItem = { id: string; case_code: string | null; problem: string | null; full_name: string | null; parent_name: string | null; child_name: string | null }
type Video = { id: string; title: string; category: string | null; publish_status: string; youtube_url: string | null; short_url: string | null; description: string | null; thumbnail_idea: string | null; sns_caption: string | null; filmed_at: string | null; customer_id: string | null; case_id: string | null; created_at: string }

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('placeholder')) return null
  return createClient(url.replace(/\/+$/, ''), key)
}
function valueOf(value: string | string[] | undefined, fallback = '') { return Array.isArray(value) ? value[0] || fallback : value || fallback }
async function getSearchParams(input: Promise<SearchParams> | SearchParams | undefined) { return input ? await Promise.resolve(input) : {} }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)) : '-' }

async function loadData() {
  const supabase = getServiceClient()
  if (!supabase) return { videos: [] as Video[], customers: [] as Customer[], cases: [] as CaseItem[], error: 'supabase_not_configured' }
  const [videos, customers, cases] = await Promise.all([
    supabase.from('case_videos').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('customers').select('id,full_name,parent_name,child_name').order('last_contact_at', { ascending: false, nullsFirst: false }).limit(500),
    supabase.from('ai_secretary_case_assets').select('id,case_code,problem,full_name,parent_name,child_name').order('created_at', { ascending: false }).limit(500),
  ])
  return { videos: (videos.data || []) as Video[], customers: (customers.data || []) as Customer[], cases: (cases.data || []) as CaseItem[], error: videos.error?.message || customers.error?.message || cases.error?.message || null }
}

export default async function AiSecretaryVideosPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const params = await getSearchParams(searchParams)
  const token = valueOf(params.token)
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN
  if (!requiredToken || token !== requiredToken) return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>
  const { videos, customers, cases, error } = await loadData()

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold text-green-700">Yatabe AI Secretary Phase9</p>
          <h2 className="text-2xl font-black text-gray-900">動画DB</h2>
          <p className="mt-1 text-sm text-gray-500">YouTube、ショート、SNS用素材を症例・顧客に紐付けます。投稿はしません。</p>
        </div>
        <Link href={`/admin/ai-secretary/cases?token=${encodeURIComponent(token)}`} className="rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white">症例DBへ</Link>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Supabase読み取りエラー: {error}</div>}
      <CaseRecordActions token={token} customers={customers} cases={cases} />
      <div className="grid gap-3 md:grid-cols-2">
        {videos.map((video) => (
          <article key={video.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{video.publish_status}</span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{video.category || 'video'}</span>
              <span className="text-xs font-bold text-gray-500">撮影 {formatDate(video.filmed_at)}</span>
            </div>
            <h3 className="mt-3 text-lg font-black text-gray-900">{video.title}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {video.youtube_url && <a href={video.youtube_url} target="_blank" rel="noreferrer" className="rounded-full border border-gray-200 px-3 py-1 text-xs font-bold text-gray-700">YouTube</a>}
              {video.short_url && <a href={video.short_url} target="_blank" rel="noreferrer" className="rounded-full border border-gray-200 px-3 py-1 text-xs font-bold text-gray-700">Short</a>}
              {video.customer_id && <Link href={`/admin/ai-secretary/customers/${video.customer_id}?token=${encodeURIComponent(token)}`} className="rounded-full border border-gray-200 px-3 py-1 text-xs font-bold text-gray-700">顧客詳細</Link>}
            </div>
            <Block label="説明文" value={video.description} />
            <Block label="サムネ案" value={video.thumbnail_idea} />
            <Block label="SNS投稿文" value={video.sns_caption} />
          </article>
        ))}
        {videos.length === 0 && <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500 md:col-span-2">動画情報はまだありません。</div>}
      </div>
    </div>
  )
}

function Block({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return <div className="mt-3 rounded-xl bg-gray-50 p-4"><p className="text-xs font-black text-gray-500">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-800">{value}</p></div>
}
