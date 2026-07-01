import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

type SearchParams = Record<string, string | string[] | undefined>
type LineItem = { id: number; customer_id: string | null; body: string; account_display_name: string | null; customer_full_name: string | null; customer_parent_name: string | null; customer_child_name: string | null; ai_summary: string | null; ai_reply_draft: string | null; occurred_at: string }
type GmailItem = { id: number; customer_id: string | null; from_email: string | null; subject: string | null; snippet: string | null; ai_summary: string | null; ai_reply_draft: string | null; occurred_at: string | null }

type Inquiry = { id: number; customer_id?: string | null; source?: string | null; title?: string | null; body?: string | null; created_at?: string | null; ai_summary?: string | null }

function getServiceClient() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key || url.includes('placeholder')) return null; return createClient(url.replace(/\/+$/, ''), key) }
function valueOf(value: string | string[] | undefined, fallback = '') { return Array.isArray(value) ? value[0] || fallback : value || fallback }
async function getSearchParams(input: Promise<SearchParams> | SearchParams | undefined) { return input ? await Promise.resolve(input) : {} }
function formatDateTime(value: string | null | undefined) { if (!value) return '-'; return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
function lineName(item: LineItem) { return item.customer_full_name || item.customer_parent_name || item.customer_child_name || `${formatDateTime(item.occurred_at).slice(0, 5)}のLINE相談` }
function hrefForCustomer(id: string | null | undefined, token: string) { return id ? `/admin/ai-secretary/customers/${id}?token=${encodeURIComponent(token)}` : `/admin/ai-secretary/customers?token=${encodeURIComponent(token)}` }
function lineDraft(text: string) { const compact = text.replace(/\s+/g, ' ').slice(0, 90); return `ご連絡ありがとうございます。\n内容確認しました。\n「${compact}」について確認して、改めてご案内いたします。\n谷田部` }
function mailDraft(subject: string | null) { return `お問い合わせありがとうございます。\n${subject ? `「${subject}」の件、` : ''}内容を確認しました。\n詳細を確認のうえ、改めてご連絡いたします。\n谷田部` }

async function loadInbox() {
  const supabase = getServiceClient()
  if (!supabase) return { error: 'supabase_not_configured' }
  const [lineResult, gmailResult, inquiryResult] = await Promise.all([
    supabase.from('ai_secretary_line_inbox').select('*').eq('status', 'needs_review').order('occurred_at', { ascending: false }).limit(120),
    supabase.from('gmail_sync_sources').select('*').eq('needs_reply', true).order('occurred_at', { ascending: false, nullsFirst: false }).limit(120),
    supabase.from('contact_inquiries').select('*').order('created_at', { ascending: false }).limit(60),
  ])
  const inquiryMissing = inquiryResult.error && /relation .* does not exist/i.test(inquiryResult.error.message)
  const error = lineResult.error?.message || gmailResult.error?.message || (!inquiryMissing ? inquiryResult.error?.message : null) || null
  return { error, lines: (lineResult.data || []) as LineItem[], gmail: (gmailResult.data || []) as GmailItem[], inquiries: (inquiryResult.data || []) as Inquiry[] }
}

export default async function InboxPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const params = await getSearchParams(searchParams)
  const token = valueOf(params.token)
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN
  if (!requiredToken || token !== requiredToken) return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>
  const data = await loadInbox()
  if (data.error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">Inbox読み取りエラー: {data.error}</div>
  return <div className="space-y-6"><Header token={token} /><div className="grid gap-4 md:grid-cols-3"><CountCard label="未対応LINE" value={data.lines.length} /><CountCard label="未返信Gmail" value={data.gmail.length} /><CountCard label="問い合わせ" value={data.inquiries.length} /></div><section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-gray-900">LINE</h3><div className="mt-4 space-y-3">{data.lines.map((line) => <article key={line.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-red-100 px-2 py-1 text-red-700">未対応</span><span className="rounded-full bg-green-100 px-2 py-1 text-green-700">{line.account_display_name || 'LINE'}</span><span className="text-gray-500">{formatDateTime(line.occurred_at)}</span></div><Link href={hrefForCustomer(line.customer_id, token)} className="mt-3 block font-black text-gray-900 hover:text-green-700">{lineName(line)}</Link><p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-3 text-sm leading-7 text-gray-700">{line.ai_summary || line.body}</p><pre className="mt-2 whitespace-pre-wrap rounded-lg border border-gray-100 bg-white p-3 text-sm leading-7 text-gray-800">{line.ai_reply_draft || lineDraft(line.body)}</pre></article>)}{data.lines.length === 0 && <p className="text-sm text-gray-500">未対応LINEはありません。</p>}</div></section><section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-gray-900">Gmail</h3><div className="mt-4 space-y-3">{data.gmail.map((mail) => <article key={mail.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-yellow-100 px-2 py-1 text-yellow-700">未返信</span><span className="text-gray-500">{formatDateTime(mail.occurred_at)}</span></div><Link href={hrefForCustomer(mail.customer_id, token)} className="mt-3 block font-black text-gray-900 hover:text-green-700">{mail.subject || '件名なし'}</Link><p className="mt-2 rounded-lg bg-white p-3 text-sm leading-7 text-gray-700">{mail.ai_summary || mail.snippet || '-'}</p><pre className="mt-2 whitespace-pre-wrap rounded-lg border border-gray-100 bg-white p-3 text-sm leading-7 text-gray-800">{mail.ai_reply_draft || mailDraft(mail.subject)}</pre></article>)}{data.gmail.length === 0 && <p className="text-sm text-gray-500">未返信Gmailはありません。</p>}</div></section><section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-gray-900">問い合わせ</h3><div className="mt-4 space-y-3">{data.inquiries.map((item) => <article key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">{item.source || 'フォーム'}</span><span className="text-gray-500">{formatDateTime(item.created_at)}</span></div><p className="mt-3 font-black text-gray-900">{item.title || '問い合わせ'}</p><p className="mt-2 rounded-lg bg-white p-3 text-sm leading-7 text-gray-700">{item.ai_summary || item.body || '-'}</p></article>)}{data.inquiries.length === 0 && <p className="text-sm text-gray-500">フォーム問い合わせデータはまだありません。</p>}</div></section></div>
}

function Header({ token }: { token: string }) { return <div className="rounded-3xl bg-gray-950 p-6 text-white"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold text-green-300">Yatabe Daily OS</p><h2 className="mt-1 text-3xl font-black">Inbox</h2><p className="mt-2 text-sm text-gray-300">LINE、Gmail、問い合わせを1つにまとめました。返信はコピーまで、自動送信はしません。</p></div><Link href={`/admin/ai-secretary/dashboard?token=${encodeURIComponent(token)}`} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-950">Morningへ</Link></div></div> }
function CountCard({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold text-gray-500">{label}</p><p className="mt-2 text-3xl font-black text-gray-900">{value}</p></div> }
