import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

type SearchParams = Record<string, string | string[] | undefined>
type Proposal = { id: string; diagnosis_id: string | null; customer_id: string | null; title: string | null; current_issue: string | null; recommended_service: string | null; recommended_plan: string | null; price_note: string | null; next_steps: string | null; body: string | null; status: string; created_at: string; customers?: { full_name: string | null; parent_name: string | null; child_name: string | null } | null }
type ContractCandidate = { id: string; proposal_id: string | null; customer_id: string | null; product_name: string | null; plan_name: string | null; estimated_amount: number | null; confidence: string; ai_reason: string | null; status: string; created_at: string }

function getServiceClient() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key || url.includes('placeholder')) return null; return createClient(url.replace(/\/+$/, ''), key) }
function valueOf(value: string | string[] | undefined, fallback = '') { return Array.isArray(value) ? value[0] || fallback : value || fallback }
async function getSearchParams(input: Promise<SearchParams> | SearchParams | undefined) { return input ? await Promise.resolve(input) : {} }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '-' }
function customerName(item: Proposal) { return item.customers?.full_name || item.customers?.parent_name || item.customers?.child_name || '顧客未確定' }

async function loadData() {
  const supabase = getServiceClient()
  if (!supabase) return { proposals: [] as Proposal[], candidates: [] as ContractCandidate[], error: 'supabase_not_configured' }
  const [proposals, candidates] = await Promise.all([
    supabase.from('ai_proposals').select('*, customers(full_name,parent_name,child_name)').order('created_at', { ascending: false }).limit(100),
    supabase.from('ai_contract_candidates').select('*').order('created_at', { ascending: false }).limit(100),
  ])
  return { proposals: (proposals.data || []) as Proposal[], candidates: (candidates.data || []) as ContractCandidate[], error: proposals.error?.message || candidates.error?.message || null }
}

export default async function ProposalsPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const params = await getSearchParams(searchParams)
  const token = valueOf(params.token)
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN
  if (!requiredToken || token !== requiredToken) return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>
  const { proposals, candidates, error } = await loadData()
  const candidateByProposal = new Map(candidates.map((item) => [item.proposal_id, item]))

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold text-green-700">Yatabe AI Secretary Phase10</p><h2 className="text-2xl font-black text-gray-900">AI提案書</h2><p className="mt-1 text-sm text-gray-500">診断結果から提案書と契約候補を確認します。送信・契約確定・料金確定はしません。</p></div><Link href={`/admin/ai-secretary/diagnosis-center?token=${encodeURIComponent(token)}`} className="rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white">AI診断センターへ</Link></div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">読み取りエラー: {error}</div>}
    <div className="grid gap-3 md:grid-cols-3"><Kpi label="提案書下書き" value={proposals.length}/><Kpi label="契約候補" value={candidates.length}/><Kpi label="確認待ち" value={proposals.filter((item) => item.status === 'draft').length}/></div>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-gray-900">提案書一覧</h3><div className="mt-4 space-y-4">{proposals.map((proposal) => { const candidate = candidateByProposal.get(proposal.id); return <article key={proposal.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{proposal.status}</span><span className="text-xs font-bold text-gray-500">{formatDate(proposal.created_at)}</span>{proposal.customer_id && <Link href={`/admin/ai-secretary/customers/${proposal.customer_id}?token=${encodeURIComponent(token)}`} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700">顧客詳細</Link>}</div><h4 className="mt-3 text-lg font-black text-gray-900">{proposal.title || 'AI提案書'}</h4><p className="mt-1 text-sm font-bold text-gray-600">{customerName(proposal)}</p><div className="mt-3 grid gap-2 md:grid-cols-4"><Mini label="悩み" value={proposal.current_issue}/><Mini label="サービス" value={proposal.recommended_service}/><Mini label="プラン" value={proposal.recommended_plan}/><Mini label="料金" value={proposal.price_note}/></div>{candidate && <div className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-900"><p className="text-xs font-black opacity-70">契約候補生成状況</p><p className="mt-1 font-bold">{candidate.product_name || candidate.plan_name || '候補'} / {candidate.estimated_amount ? `${candidate.estimated_amount.toLocaleString()}円` : '金額未確定'} / 信頼度 {candidate.confidence}</p><p className="mt-1 text-sm leading-7">{candidate.ai_reason || 'AI診断から候補生成済み'}</p></div>}<pre className="mt-3 max-h-[480px] overflow-auto whitespace-pre-wrap rounded-xl bg-white p-4 text-sm leading-7 text-gray-800">{proposal.body || '-'}</pre></article> })}{proposals.length === 0 && <p className="text-sm text-gray-500">提案書はまだありません。AI診断センターから生成してください。</p>}</div></section>
  </div>
}

function Kpi({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-900"><p className="text-xs font-bold opacity-70">{label}</p><p className="mt-2 text-4xl font-black">{value}</p></div> }
function Mini({ label, value }: { label: string; value: string | null }) { return <div className="rounded-lg bg-white p-3"><p className="text-xs font-black text-gray-500">{label}</p><p className="mt-1 text-sm font-bold text-gray-900">{value || '-'}</p></div> }
