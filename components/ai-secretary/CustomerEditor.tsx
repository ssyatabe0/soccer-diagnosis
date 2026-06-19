'use client'

import { useState, useTransition } from 'react'

type Customer = {
  id: string
  full_name: string | null
  parent_name: string | null
  child_name: string | null
  service_type: string
  status: string
  grade: string | null
  region: string | null
  team_name: string | null
  inquiry_date: string | null
  trial_date: string | null
  enrolled_date: string | null
  withdrawn_date: string | null
  owner_name: string | null
  memo: string | null
}

type Props = {
  customer: Customer
  token: string
}

const serviceOptions = [
  ['private_lesson', '個人レッスン'],
  ['ashiwaza_dribble', '足技塾/ドリブル塾'],
  ['sysc', 'SYSC'],
  ['kids_school', 'キッズスクール'],
  ['overseas', '海外問い合わせ'],
  ['unknown', '未分類'],
]

const statusOptions = [
  ['new_inquiry', '新規問い合わせ'],
  ['trial_scheduling', '体験調整中'],
  ['trial_booked', '体験予約済み'],
  ['trial_done', '体験完了'],
  ['considering', '検討中'],
  ['enrolled', '入会'],
  ['continuing', '継続'],
  ['paused', '休会'],
  ['withdrawn', '退会'],
]

export function CustomerEditor({ customer, token }: Props) {
  const [form, setForm] = useState({
    full_name: customer.full_name || '',
    parent_name: customer.parent_name || '',
    child_name: customer.child_name || '',
    service_type: customer.service_type || 'unknown',
    status: customer.status || 'new_inquiry',
    grade: customer.grade || '',
    region: customer.region || '',
    team_name: customer.team_name || '',
    inquiry_date: customer.inquiry_date || '',
    trial_date: customer.trial_date || '',
    enrolled_date: customer.enrolled_date || '',
    withdrawn_date: customer.withdrawn_date || '',
    owner_name: customer.owner_name || '',
    memo: customer.memo || '',
  })
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function save() {
    setMessage('')
    startTransition(async () => {
      const response = await fetch(`/api/ai-secretary/customers/${customer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })

      setMessage(response.ok ? '保存しました' : '保存できませんでした')
    })
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900">顧客マスタ</h2>
          <p className="mt-1 text-xs text-gray-500">LINEから自動作成された顧客情報を手動で整えます。</p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-full bg-gray-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? '保存中' : '保存'}
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="氏名" value={form.full_name} onChange={(value) => update('full_name', value)} />
        <Field label="保護者名" value={form.parent_name} onChange={(value) => update('parent_name', value)} />
        <Field label="子ども名" value={form.child_name} onChange={(value) => update('child_name', value)} />
        <Field label="学年" value={form.grade} onChange={(value) => update('grade', value)} />
        <Field label="地域" value={form.region} onChange={(value) => update('region', value)} />
        <Field label="所属チーム" value={form.team_name} onChange={(value) => update('team_name', value)} />
        <Select label="サービス種別" value={form.service_type} options={serviceOptions} onChange={(value) => update('service_type', value)} />
        <Select label="ステータス" value={form.status} options={statusOptions} onChange={(value) => update('status', value)} />
        <Field label="問い合わせ日" type="date" value={form.inquiry_date} onChange={(value) => update('inquiry_date', value)} />
        <Field label="体験日" type="date" value={form.trial_date} onChange={(value) => update('trial_date', value)} />
        <Field label="入会日" type="date" value={form.enrolled_date} onChange={(value) => update('enrolled_date', value)} />
        <Field label="退会日" type="date" value={form.withdrawn_date} onChange={(value) => update('withdrawn_date', value)} />
        <Field label="担当者" value={form.owner_name} onChange={(value) => update('owner_name', value)} />
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-bold text-gray-500">メモ</span>
        <textarea
          value={form.memo}
          onChange={(event) => update('memo', event.target.value)}
          className="mt-1 min-h-28 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
        />
      </label>

      {message && <p className="mt-3 text-xs font-bold text-green-700">{message}</p>}
    </section>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-gray-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
      />
    </label>
  )
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
      >
        {options.map(([key, labelText]) => (
          <option key={key} value={key}>{labelText}</option>
        ))}
      </select>
    </label>
  )
}
