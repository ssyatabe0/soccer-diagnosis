'use client'

import { useMemo, useState, useTransition } from 'react'

type Product = {
  id: string
  name: string
  product_type: string
  ticket_count: number | null
  price: number | null
  monthly_fee: number | null
}

type Contract = {
  id: string
  product_name: string | null
  status: string
  remaining_count: number | null
}

type FollowTask = {
  id: number
  task_type: string
  title: string
  due_date: string | null
  status: string
  priority: string
}

type Props = {
  customerId: string
  token: string
  products: Product[]
  contracts: Contract[]
  followTasks: FollowTask[]
}

const taskOptions = [
  ['manual', '手動フォロー'],
  ['trial_follow', '体験後フォロー'],
  ['review_request', 'レビュー依頼'],
  ['ashiwaza_candidate', '足技塾候補'],
  ['sysc_candidate', 'SYSC候補'],
  ['kids_school_candidate', 'キッズスクール候補'],
  ['private_lesson_reproposal', '個人レッスン再提案'],
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function CustomerRevenueActions({ customerId, token, products, contracts, followTasks }: Props) {
  const activeContracts = useMemo(() => contracts.filter((contract) => contract.status === 'active' || contract.status === 'paused'), [contracts])
  const firstProduct = products[0]?.id || ''
  const firstContract = activeContracts[0]?.id || ''
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const [contractForm, setContractForm] = useState({
    product_id: firstProduct,
    purchase_date: today(),
    start_date: today(),
    first_usage_date: '',
    purchased_count: '',
    amount: '',
    monthly_fee: '',
    payment_status: 'unknown',
    notes: '',
  })
  const [usageForm, setUsageForm] = useState({
    contract_id: firstContract,
    usage_date: today(),
    used_count: '1',
    lesson_title: '',
    notes: '',
  })
  const [taskForm, setTaskForm] = useState({
    task_type: 'manual',
    title: '手動フォロー',
    due_date: today(),
    priority: 'medium',
    notes: '',
  })

  function updateContract(key: keyof typeof contractForm, value: string) {
    setContractForm((current) => ({ ...current, [key]: value }))
  }

  function updateUsage(key: keyof typeof usageForm, value: string) {
    setUsageForm((current) => ({ ...current, [key]: value }))
  }

  function updateTask(key: keyof typeof taskForm, value: string) {
    setTaskForm((current) => ({ ...current, [key]: value }))
  }

  function callApi(path: string, method: 'POST' | 'PATCH', body: Record<string, unknown>, successMessage: string) {
    setMessage('')
    startTransition(async () => {
      const response = await fetch(path, {
        method,
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

  function createContract() {
    callApi('/api/ai-secretary/contracts', 'POST', { customer_id: customerId, ...contractForm }, '契約を登録しました')
  }

  function createUsage() {
    callApi('/api/ai-secretary/ticket-usage', 'POST', { customer_id: customerId, ...usageForm }, '回数券消化を登録しました')
  }

  function createTask() {
    callApi('/api/ai-secretary/follow-tasks', 'POST', { customer_id: customerId, ...taskForm }, 'フォロータスクを作成しました')
  }

  function completeTask(id: number) {
    callApi('/api/ai-secretary/follow-tasks', 'PATCH', { id, status: 'done' }, 'フォローを完了しました')
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-black text-gray-900">手動管理</h3>
          <p className="mt-1 text-xs text-gray-500">自動送信はせず、契約・消化・フォローだけを保存します。</p>
        </div>
        {message && <p className="rounded-full bg-green-50 px-3 py-2 text-xs font-bold text-green-700">{message}</p>}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h4 className="font-black text-gray-900">契約登録</h4>
          <div className="mt-3 space-y-3">
            <Select label="商品" value={contractForm.product_id} onChange={(value) => updateContract('product_id', value)} options={products.map((product) => [product.id, product.name])} />
            <Field label="購入日" type="date" value={contractForm.purchase_date} onChange={(value) => updateContract('purchase_date', value)} />
            <Field label="開始日" type="date" value={contractForm.start_date} onChange={(value) => updateContract('start_date', value)} />
            <Field label="初回利用日" type="date" value={contractForm.first_usage_date} onChange={(value) => updateContract('first_usage_date', value)} />
            <Field label="購入回数" value={contractForm.purchased_count} onChange={(value) => updateContract('purchased_count', value)} placeholder="商品設定を使う場合は空欄" />
            <Field label="金額" value={contractForm.amount} onChange={(value) => updateContract('amount', value)} />
            <Field label="月謝" value={contractForm.monthly_fee} onChange={(value) => updateContract('monthly_fee', value)} />
            <Select label="入金" value={contractForm.payment_status} onChange={(value) => updateContract('payment_status', value)} options={[[ 'unknown', '未確認' ], [ 'unpaid', '未入金' ], [ 'paid', '入金済み' ]]} />
            <Textarea label="メモ" value={contractForm.notes} onChange={(value) => updateContract('notes', value)} />
            <button type="button" onClick={createContract} disabled={isPending || !contractForm.product_id} className="w-full rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">契約を保存</button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h4 className="font-black text-gray-900">回数券消化</h4>
          <div className="mt-3 space-y-3">
            <Select label="契約" value={usageForm.contract_id} onChange={(value) => updateUsage('contract_id', value)} options={activeContracts.map((contract) => [contract.id, `${contract.product_name || '契約'} / 残${contract.remaining_count ?? '-'}回`])} />
            <Field label="実施日" type="date" value={usageForm.usage_date} onChange={(value) => updateUsage('usage_date', value)} />
            <Field label="消化回数" value={usageForm.used_count} onChange={(value) => updateUsage('used_count', value)} />
            <Field label="レッスン名" value={usageForm.lesson_title} onChange={(value) => updateUsage('lesson_title', value)} />
            <Textarea label="メモ" value={usageForm.notes} onChange={(value) => updateUsage('notes', value)} />
            <button type="button" onClick={createUsage} disabled={isPending || !usageForm.contract_id} className="w-full rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">消化を保存</button>
          </div>
          {activeContracts.length === 0 && <p className="mt-3 rounded-lg bg-yellow-50 p-3 text-xs font-bold text-yellow-800">先に契約を登録してください。</p>}
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h4 className="font-black text-gray-900">フォロー作成</h4>
          <div className="mt-3 space-y-3">
            <Select label="種別" value={taskForm.task_type} onChange={(value) => updateTask('task_type', value)} options={taskOptions} />
            <Field label="タイトル" value={taskForm.title} onChange={(value) => updateTask('title', value)} />
            <Field label="期限" type="date" value={taskForm.due_date} onChange={(value) => updateTask('due_date', value)} />
            <Select label="優先度" value={taskForm.priority} onChange={(value) => updateTask('priority', value)} options={[[ 'high', '高' ], [ 'medium', '中' ], [ 'low', '低' ]]} />
            <Textarea label="メモ" value={taskForm.notes} onChange={(value) => updateTask('notes', value)} />
            <button type="button" onClick={createTask} disabled={isPending} className="w-full rounded-full bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">フォローを作成</button>
          </div>

          <div className="mt-5 space-y-2">
            <p className="text-xs font-black text-gray-500">未完了フォロー</p>
            {followTasks.filter((task) => task.status === 'open').map((task) => (
              <div key={task.id} className="rounded-lg bg-white p-3">
                <p className="text-sm font-bold text-gray-900">{task.title}</p>
                <p className="mt-1 text-xs text-gray-500">{task.due_date || '期限なし'} / {task.priority}</p>
                <button type="button" onClick={() => completeTask(task.id)} disabled={isPending} className="mt-2 rounded-full border border-gray-200 px-3 py-1 text-xs font-bold text-gray-700 disabled:opacity-50">完了にする</button>
              </div>
            ))}
            {followTasks.filter((task) => task.status === 'open').length === 0 && <p className="text-xs text-gray-500">未完了フォローはありません。</p>}
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

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-gray-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100">
        <option value="">選択してください</option>
        {options.map(([key, labelText]) => <option key={key} value={key}>{labelText}</option>)}
      </select>
    </label>
  )
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-gray-500">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
    </label>
  )
}
