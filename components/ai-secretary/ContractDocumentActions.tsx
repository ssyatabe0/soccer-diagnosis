'use client'

import { useState, useTransition } from 'react'

type Template = {
  id: string
  name: string
  service_type: string
  document_type: string
}

type Document = {
  id: string
  title: string
  status: string
  file_name: string | null
  ai_suggestion: string | null
  notes: string | null
  created_at: string
}

type Props = {
  customerId: string
  token: string
  templates: Template[]
  documents: Document[]
}

const statusOptions = [
  ['created', '作成済み'],
  ['ready_to_send', '送付準備済み'],
  ['sent', '送付済み'],
  ['checking', '確認中'],
  ['waiting_signature', '署名待ち'],
  ['signed', '締結済み'],
  ['cancelled', 'キャンセル'],
  ['expired', '期限切れ'],
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function ContractDocumentActions({ customerId, token, templates, documents }: Props) {
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    template_id: templates[0]?.id || '',
    service_name: '',
    start_date: today(),
    end_date: '',
    valid_until: '',
    ticket_count: '',
    amount: '',
    monthly_fee: '',
    payment_method: '',
    notes: '',
  })

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function createDocument() {
    setMessage('')
    startTransition(async () => {
      const response = await fetch('/api/ai-secretary/contract-documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customer_id: customerId, ...form }),
      })
      const result = await response.json().catch(() => null)
      if (response.ok) {
        setMessage('契約書PDFを作成しました')
        window.location.reload()
      } else {
        setMessage(result?.error ? `作成できませんでした: ${result.error}` : '作成できませんでした')
      }
    })
  }

  function updateDocument(id: string, status: string) {
    setMessage('')
    startTransition(async () => {
      const response = await fetch(`/api/ai-secretary/contract-documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
      setMessage(response.ok ? '契約ステータスを更新しました' : '契約ステータスを更新できませんでした')
      if (response.ok) window.location.reload()
    })
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-black text-gray-900">契約書管理</h3>
          <p className="mt-1 text-xs text-gray-500">PDF作成・保存・送付準備まで。クラウドサイン送信はしません。</p>
        </div>
        {message && <p className="rounded-full bg-green-50 px-3 py-2 text-xs font-bold text-green-700">{message}</p>}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h4 className="font-black text-gray-900">契約書作成</h4>
          <div className="mt-3 space-y-3">
            <Select label="テンプレート" value={form.template_id} onChange={(value) => update('template_id', value)} options={templates.map((template) => [template.id, template.name])} />
            <Field label="サービス名" value={form.service_name} onChange={(value) => update('service_name', value)} placeholder="未入力ならテンプレート種別" />
            <Field label="契約開始日" type="date" value={form.start_date} onChange={(value) => update('start_date', value)} />
            <Field label="契約終了日" type="date" value={form.end_date} onChange={(value) => update('end_date', value)} />
            <Field label="有効期限" type="date" value={form.valid_until} onChange={(value) => update('valid_until', value)} />
            <Field label="回数券情報" value={form.ticket_count} onChange={(value) => update('ticket_count', value)} placeholder="4 / 8 など" />
            <Field label="料金" value={form.amount} onChange={(value) => update('amount', value)} />
            <Field label="月謝" value={form.monthly_fee} onChange={(value) => update('monthly_fee', value)} />
            <Field label="支払方法" value={form.payment_method} onChange={(value) => update('payment_method', value)} />
            <Textarea label="メモ・注意事項" value={form.notes} onChange={(value) => update('notes', value)} />
            <button type="button" onClick={createDocument} disabled={isPending || !form.template_id} className="w-full rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">PDFを作成して保存</button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h4 className="font-black text-gray-900">契約書一覧</h4>
          <div className="mt-3 space-y-3">
            {documents.map((document) => (
              <div key={document.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-black text-gray-900">{document.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{new Date(document.created_at).toLocaleString('ja-JP')} / {statusLabel(document.status)}</p>
                  </div>
                  <a href={`/api/ai-secretary/contract-documents/${document.id}/download?token=${encodeURIComponent(token)}`} className="rounded-full bg-green-700 px-3 py-2 text-xs font-bold text-white">PDFダウンロード</a>
                </div>
                {document.ai_suggestion && <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-yellow-50 p-3 text-xs leading-6 text-yellow-900">{document.ai_suggestion}</pre>}
                <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                  <Select label="ステータス変更" value={document.status} onChange={(value) => updateDocument(document.id, value)} options={statusOptions} />
                  <button type="button" onClick={() => updateDocument(document.id, 'ready_to_send')} disabled={isPending} className="self-end rounded-full border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 disabled:opacity-50">送付準備完了</button>
                </div>
                {document.notes && <p className="mt-2 text-xs text-gray-500">メモ: {document.notes}</p>}
              </div>
            ))}
            {documents.length === 0 && <p className="rounded-xl bg-white p-4 text-sm text-gray-500">契約書はまだありません。</p>}
          </div>
        </div>
      </div>
    </section>
  )
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    draft: '未作成',
    created: '作成済み',
    ready_to_send: '送付準備済み',
    sent: '送付済み',
    checking: '確認中',
    waiting_signature: '署名待ち',
    signed: '締結済み',
    cancelled: 'キャンセル',
    expired: '期限切れ',
  }
  return labels[value] || value
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block"><span className="text-xs font-bold text-gray-500">{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" /></label>
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-xs font-bold text-gray-500">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"><option value="">選択してください</option>{options.map(([key, labelText]) => <option key={key} value={key}>{labelText}</option>)}</select></label>
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-xs font-bold text-gray-500">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" /></label>
}
