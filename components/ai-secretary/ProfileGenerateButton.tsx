'use client'

import { useState, useTransition } from 'react'

export function ProfileGenerateButton({ customerId, token }: { customerId: string; token: string }) {
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function generate() {
    setMessage('')
    startTransition(async () => {
      const response = await fetch('/api/ai-secretary/profiles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customer_id: customerId }),
      })
      if (response.ok) {
        setMessage('AI人物カルテを生成しました')
        window.location.reload()
      } else {
        setMessage('生成できませんでした')
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={generate} disabled={isPending} className="rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {isPending ? '生成中' : 'AI人物カルテ生成'}
      </button>
      {message && <span className="text-xs font-bold text-green-700">{message}</span>}
    </div>
  )
}
