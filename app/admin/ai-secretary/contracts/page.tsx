import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

type SearchParams = Record<string, string | string[] | undefined>

type Template = {
  id: string
  template_key: string
  name: string
  service_type: string
  document_type: string
  required_fields: string[] | null
  notes: string | null
  cloudsign_ready: boolean
  is_active: boolean
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

async function loadTemplates() {
  const supabase = getServiceClient()
  if (!supabase) return { templates: [] as Template[], error: 'supabase_not_configured' }
  const { data, error } = await supabase.from('contract_templates').select('*').order('service_type', { ascending: true }).order('name', { ascending: true })
  return { templates: (data || []) as Template[], error: error?.message || null }
}

function serviceLabel(value: string) {
  const labels: Record<string, string> = {
    yatabe_private_lesson: '谷田部個人レッスン',
    staff_private_lesson: 'スタッフ個人レッスン',
    kids_school: 'キッズスクール',
    ashiwaza_dribble: '足技塾',
    sysc: 'SYSC',
    online_diagnosis: 'オンライン診断',
    overseas: '海外向け',
    common: '共通同意書',
  }
  return labels[value] || value
}

function typeLabel(value: string) {
  const labels: Record<string, string> = {
    contract: '契約書',
    terms: '利用規約',
    consent: '同意書',
    privacy: '個人情報同意',
    photo_video: '写真動画同意',
  }
  return labels[value] || value
}

export default async function ContractTemplatesPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const params = await getSearchParams(searchParams)
  const token = valueOf(params.token)
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN
  if (!requiredToken || token !== requiredToken) {
    return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900">閲覧トークンが必要です。</div>
  }

  const { templates, error } = await loadTemplates()

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold text-green-700">Yatabe AI Secretary Phase6</p>
          <h2 className="text-2xl font-black text-gray-900">契約書テンプレート管理</h2>
          <p className="mt-1 text-sm text-gray-500">クラウドサイン送信はせず、PDF生成・保存・送付準備まで管理します。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/ai-secretary/dashboard?token=${encodeURIComponent(token)}`} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700">今日の対応へ</Link>
          <Link href={`/admin/ai-secretary/customers?token=${encodeURIComponent(token)}`} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700">顧客から作成</Link>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Supabase読み取りエラー: {error}</div>}

      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((template) => (
          <div key={template.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{serviceLabel(template.service_type)}</span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{typeLabel(template.document_type)}</span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{template.is_active ? '有効' : '停止'}</span>
            </div>
            <h3 className="mt-3 text-lg font-black text-gray-900">{template.name}</h3>
            <p className="mt-2 text-sm text-gray-600">必要情報: {(template.required_fields || []).join(' / ') || '-'}</p>
            <p className="mt-2 text-sm text-gray-500">{template.notes || '-'}</p>
            <div className="mt-3 rounded-xl bg-yellow-50 p-3 text-xs font-bold text-yellow-800">将来クラウドサインCorporateへ移行したら、このテンプレートからPDFアップロード・署名依頼へ拡張できます。</div>
          </div>
        ))}
      </div>
    </div>
  )
}
