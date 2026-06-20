import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { DiagnosisGenerateButton } from '@/components/ai-secretary/DiagnosisGenerateButton'

type SearchParams = Record<string, string | string[] | undefined>
type LineItem = { id: number; customer_id: string | null; body: string; ai_summary: string | null; account_display_name: string | null; occurred_at: string; customer_full_name: string | null; customer_parent_name: string | null; customer_child_name: string | null }
type GmailItem = { id: number; customer_id: string | null; subject: string | null; snippet: string | null; ai_summary: string | null; occurred_at: string | null; from_email: string | null }
type Diagnosis = { id: string; customer_id: string | null; source_type: string; concern_type: string | null; recommended_service: string | null; recommended_plan: string | null; next_step: string | null; ai_summary: string | null; created_at: string; full_name: string | null; parent_name: string | null; child_name: string | null; proposal_id: string | null; contract_product_name: string | null }

function getServiceClient() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key || url.includes('placeholder')) return null; return createClient(url.replace(/\/+$/, ''), key) }
function valueOf(value: string | string[] | undefined, fallback = '') { return Array.isArray(value) ? value[0] || fallback : value || fallback }
async function getSearchParams(input: Promise<SearchParams> | SearchParams | undefined) { return input ? await Promise.resolve(input) : {} }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '-' }
function nameOf(item: { full_name?: string | null; parent_name?: string | null; child_name?: string | null; customer_full_name?: string | null; customer_parent_name?: string | null; customer_child_name?: string | null }) { return item.full_name || item.parent_name || item.child_name || item.customer_full_name || item.customer_parent_name || item.customer_child_name || '顧客未確定' }

async function loadData() {
  const supabase = getServiceClient()
  if (!supabase) return { lines: [] as LineItem[], gmail: [] as GmailItem[], diagnoses: [] as Diagnosis[], error: 'supabase_not_configured' }
  const [lines, gmail, diagnoses] = await Promise.all([
    supabase.from('ai_secretary_line_inbox').select('*').eq('status', 'needs_review').order('occurred_at', { ascending: false }).limit(50),
    supabase.from('gmail_sync_sources').select('*').eq('needs_reply', true).eq('status', 'needs_review').order('occurred_at', { ascending: false, nullsFirst: false }).limit(50),
    supabase.from('ai_secretary_diagnosis_center').select('*').order('created_at', { ascending: false }).limit(100),
  ])
  return { lines: (lines.data || []) as LineItem[], gmail: (gmail.data || []) as GmailItem[], diagnoses: (diagnoses.data || []) as Diagnosis[], error: lines.error?.message || gmail.error?.message || diagnoses.error?.message || null }
}

export default async function DiagnosisCenterPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const params = await getSearchParams(searchParams)
  const token = valueOf(params.token)
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN
  if (!requiredToken || token !== requiredToken) return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>
  const { lines, gmail, diagnoses, error } = await loadData()

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold text-green-700">Yatabe AI Secretary Phase10</p><h2 className="text-2xl font-black text-gray-900">AI診断センター</h2><p className="mt-1 text-sm text-gray-500">問い合わせから悩み分類、原因候補、類似症例、サービス提案、契約候補まで下書き生成します。送信・確定はしません。</p></div><Link href={`/admin/ai-secretary/proposals?token=${encodeURIComponent(token)}`} className="rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white">AI提案書へ</Link></div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">読み取りエラー: {error}</div>}
    <div className="grid gap-3 md:grid-cols-3"><Kpi label="未対応LINE診断候補" value={lines.length}/><Kpi label="未返信Gmail診断候補" value={gmail.length}/><Kpi label="生成済み診断" value={diagnoses.length}/></div>
    <SourceSection title="LINE相談から診断" token={token} items={lines.map((item) => ({ id: item.id, customerId: item.customer_id, sourceType: 'line', title: nameOf(item), subtitle: `${item.account_display_name || 'LINE'} / ${formatDate(item.occurred_at)}`, text: item.ai_summary || item.body }))} />
    <SourceSection title="Gmail相談から診断" token={token} items={gmail.map((item) => ({ id: item.id, customerId: item.customer_id, sourceType: 'gmail', title: item.subject || nameOf({}), subtitle: `${item.from_email || 'Gmail'} / ${formatDate(item.occurred_at)}`, text: item.ai_summary || item.snippet || '' }))} />
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-gray-900">生成済みAI診断</h3><div className="mt-4 space-y-3">{diagnoses.map((item) => <article key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{item.source_type}</span><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{item.concern_type || '未分類'}</span><span className="text-xs font-bold text-gray-500">{formatDate(item.created_at)}</span></div><h4 className="mt-3 font-black text-gray-900">{nameOf(item)}</h4><p className="mt-2 rounded-lg bg-white p-3 text-sm leading-7 text-gray-700">{item.ai_summary || '-'}</p><div className="mt-3 grid gap-2 md:grid-cols-3"><Mini label="おすすめサービス" value={item.recommended_service}/><Mini label="おすすめプラン" value={item.recommended_plan}/><Mini label="契約候補" value={item.contract_product_name}/></div></article>)}{diagnoses.length === 0 && <p className="text-sm text-gray-500">AI診断はまだありません。</p>}</div></section>
  </div>
}

function Kpi({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-green-900"><p className="text-xs font-bold opacity-70">{label}</p><p className="mt-2 text-4xl font-black">{value}</p></div> }
function Mini({ label, value }: { label: string; value: string | null }) { return <div className="rounded-lg bg-white p-3"><p className="text-xs font-black text-gray-500">{label}</p><p className="mt-1 text-sm font-bold text-gray-900">{value || '-'}</p></div> }
function SourceSection({ title, items, token }: { title: string; token: string; items: Array<{ id: number; customerId: string | null; sourceType: string; title: string; subtitle: string; text: string }> }) { return <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-gray-900">{title}</h3><div className="mt-4 space-y-3">{items.map((item) => <article key={`${item.sourceType}-${item.id}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="font-black text-gray-900">{item.title}</p><p className="mt-1 text-xs font-bold text-gray-500">{item.subtitle}</p><p className="mt-2 line-clamp-3 text-sm leading-7 text-gray-700">{item.text}</p></div><DiagnosisGenerateButton token={token} sourceType={item.sourceType} sourceId={item.id} customerId={item.customerId} label="この相談をAI診断" /></div></article>)}{items.length === 0 && <p className="text-sm text-gray-500">対象はありません。</p>}</div></section> }
