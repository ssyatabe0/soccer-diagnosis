'use client'

import { useState, useTransition } from 'react'

type CopyReplyButtonProps = {
  text: string | null
}

export function CopyReplyButton({ text }: CopyReplyButtonProps) {
  const [copied, setCopied] = useState(false)
  const disabled = !text

  async function copy() {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={disabled}
      className="rounded-full bg-gray-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
    >
      {copied ? 'コピー済み' : '返信文をコピー'}
    </button>
  )
}

type ManualMemoFormProps = {
  id: number
  initialMemo: string | null
  token: string
}

export function ManualMemoForm({ id, initialMemo, token }: ManualMemoFormProps) {
  const [memo, setMemo] = useState(initialMemo || '')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function saveMemo() {
    setMessage('')
    startTransition(async () => {
      const response = await fetch('/api/ai-secretary/line-inbox', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, manual_memo: memo }),
      })

      if (!response.ok) {
        setMessage('保存できませんでした')
        return
      }

      setMessage('保存しました')
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-gray-900">手動メモ</h3>
        <button
          type="button"
          onClick={saveMemo}
          disabled={isPending}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-100 disabled:opacity-50"
        >
          {isPending ? '保存中' : 'メモ保存'}
        </button>
      </div>
      <textarea
        value={memo}
        onChange={(event) => setMemo(event.target.value)}
        placeholder="例: 6/20に候補日を返信。兄弟あり。強く営業しすぎない。"
        className="mt-3 min-h-28 w-full rounded-lg border border-gray-200 bg-white p-3 text-sm leading-6 text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
      />
      {message && <p className="mt-2 text-xs font-bold text-green-700">{message}</p>}
    </div>
  )
}
