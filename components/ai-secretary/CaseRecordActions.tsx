'use client'

import { useMemo, useState, useTransition } from 'react'

type Customer = {
  id: string
  full_name: string | null
  parent_name: string | null
  child_name: string | null
}

type CaseItem = {
  id: string
  case_code: string | null
  problem: string | null
  child_name?: string | null
  full_name?: string | null
  parent_name?: string | null
}

type Props = {
  token: string
  customers?: Customer[]
  cases?: CaseItem[]
  defaultCustomerId?: string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function customerName(customer: Customer) {
  return customer.full_name || customer.child_name || customer.parent_name || '名前未登録'
}

function caseName(item: CaseItem) {
  return item.case_code || item.problem || item.child_name || item.full_name || item.parent_name || '症例カルテ'
}

export function CaseRecordActions({ token, customers = [], cases = [], defaultCustomerId = '' }: Props) {
  const firstCustomer = defaultCustomerId || customers[0]?.id || ''
  const firstCase = cases[0]?.id || ''
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const [caseForm, setCaseForm] = useState({
    customer_id: firstCustomer,
    age: '',
    grade: '',
    position: '',
    problem: '',
    cause: '',
    improvement: '',
    result: '',
    parent_feedback: '',
    publish_status: 'private',
    country: '日本',
    region: '',
    tags: '',
  })
  const [videoForm, setVideoForm] = useState({
    customer_id: firstCustomer,
    case_id: firstCase,
    filmed_at: today(),
    title: '',
    category: 'case',
    publish_status: 'private',
    youtube_url: '',
    short_url: '',
    description: '',
    thumbnail_idea: '',
    sns_caption: '',
  })

  const customerOptions = useMemo(() => customers.map((customer) => [customer.id, customerName(customer)]), [customers])
  const caseOptions = useMemo(() => cases.map((item) => [item.id, caseName(item)]), [cases])

  function updateCase(key: keyof typeof caseForm, value: string) {
    setCaseForm((current) => ({ ...current, [key]: value }))
  }

  function updateVideo(key: keyof typeof videoForm, value: string) {
    setVideoForm((current) => ({ ...current, [key]: value }))
  }

  function callApi(path: string, body: Record<string, unknown>, successMessage: string) {
    setMessage('')
    startTransition(async () => {
      const response = await fetch(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      if (response.ok) {
        setMessage(successMessage)
        window.location.reload()
      } else {
        const result = await response.json().catch(() => null)
        setMessage(result?.error ? `保存できませんでした: ${result.error}` : '保存できませんでした')
      }
    })
  }

  function createCase() {
    callApi('/api/ai-secretary/cases', caseForm, '症例カルテを保存しました')
  }

  function createVideo() {
    callApi('/api/ai-secretary/videos', videoForm, '動画情報を保存しました')
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-black text-gray-900">症例・動画を登録</h3>
          <p className="mt-1 text-xs text-gray-500">公開や送信はしません。顧客に紐付く症例と動画素材をAI秘書へ保存します。</p>
        </div>
        {message && <p className="rounded-full bg-green-50 px-3 py-2 text-xs font-bold text-green-700">{message}</p>}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h4 className="font-black text-gray-900">症例カルテ作成</h4>
          <div className="mt-3 space-y-3">
            <Select label="顧客" value={caseForm.customer_id} onChange={(value) => updateCase('customer_id', value)} options={customerOptions} allowEmpty />
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="年齢" value={caseForm.age} onChange={(value) => updateCase('age', value)} />
              <Field label="学年" value={caseForm.grade} onChange={(value) => updateCase('grade', value)} placeholder="小5" />
              <Field label="ポジション" value={caseForm.position} onChange={(value) => updateCase('position', value)} placeholder="FW" />
            </div>
            <Textarea label="悩み" value={caseForm.problem} onChange={(value) => updateCase('problem', value)} placeholder="例: ドリブルで相手を抜けない" />
            <Textarea label="原因" value={caseForm.cause} onChange={(value) => updateCase('cause', value)} />
            <Textarea label="改善内容" value={caseForm.improvement} onChange={(value) => updateCase('improvement', value)} />
            <Textarea label="結果" value={caseForm.result} onChange={(value) => updateCase('result', value)} />
            <Textarea label="保護者の感想" value={caseForm.parent_feedback} onChange={(value) => updateCase('parent_feedback', value)} />
            <div className="grid gap-3 md:grid-cols-3">
              <Select label="公開可否" value={caseForm.publish_status} onChange={(value) => updateCase('publish_status', value)} options={[[ 'private', '非公開' ], [ 'permission_needed', '許可確認' ], [ 'public_allowed', '公開可' ], [ 'published', '公開済み' ]]} />
              <Field label="国" value={caseForm.country} onChange={(value) => updateCase('country', value)} />
              <Field label="地域" value={caseForm.region} onChange={(value) => updateCase('region', value)} />
            </div>
            <Field label="タグ" value={caseForm.tags} onChange={(value) => updateCase('tags', value)} placeholder="ドリブル, MLS NEXT, 左利き" />
            <button type="button" onClick={createCase} disabled={isPending || (!caseForm.problem && !caseForm.result)} className="w-full rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">症例を保存</button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h4 className="font-black text-gray-900">動画情報作成</h4>
          <div className="mt-3 space-y-3">
            <Select label="顧客" value={videoForm.customer_id} onChange={(value) => updateVideo('customer_id', value)} options={customerOptions} allowEmpty />
            <Select label="症例" value={videoForm.case_id} onChange={(value) => updateVideo('case_id', value)} options={caseOptions} allowEmpty />
            <Field label="撮影日" type="date" value={videoForm.filmed_at} onChange={(value) => updateVideo('filmed_at', value)} />
            <Field label="タイトル" value={videoForm.title} onChange={(value) => updateVideo('title', value)} placeholder="ドリブル改善 Before/After" />
            <div className="grid gap-3 md:grid-cols-2">
              <Select label="カテゴリ" value={videoForm.category} onChange={(value) => updateVideo('category', value)} options={[[ 'case', '症例' ], [ 'lesson', 'レッスン' ], [ 'short', 'ショート' ], [ 'youtube', 'YouTube' ], [ 'sns', 'SNS' ], [ 'interview', 'インタビュー' ], [ 'other', 'その他' ]]} />
              <Select label="公開状況" value={videoForm.publish_status} onChange={(value) => updateVideo('publish_status', value)} options={[[ 'private', '非公開' ], [ 'permission_needed', '許可確認' ], [ 'scheduled', '公開予定' ], [ 'published', '公開済み' ], [ 'unlisted', '限定公開' ]]} />
            </div>
            <Field label="YouTube URL" value={videoForm.youtube_url} onChange={(value) => updateVideo('youtube_url', value)} />
            <Field label="ショートURL" value={videoForm.short_url} onChange={(value) => updateVideo('short_url', value)} />
            <Textarea label="動画説明文" value={videoForm.description} onChange={(value) => updateVideo('description', value)} />
            <Textarea label="サムネ案" value={videoForm.thumbnail_idea} onChange={(value) => updateVideo('thumbnail_idea', value)} />
            <Textarea label="SNS投稿文" value={videoForm.sns_caption} onChange={(value) => updateVideo('sns_caption', value)} />
            <button type="button" onClick={createVideo} disabled={isPending || !videoForm.title} className="w-full rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">動画を保存</button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-gray-500">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
    </label>
  )
}

function Select({ label, value, options, onChange, allowEmpty = false }: { label: string; value: string; options: string[][]; onChange: (value: string) => void; allowEmpty?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-gray-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100">
        {allowEmpty && <option value="">未選択</option>}
        {options.map(([key, labelText]) => <option key={key} value={key}>{labelText}</option>)}
      </select>
    </label>
  )
}

function Textarea({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-gray-500">{label}</span>
      <textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
    </label>
  )
}
