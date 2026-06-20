'use client'

import { useState, useTransition } from 'react'

type Props = {
  token: string
  sourceType: string
  sourceId?: string | number | null
  sourceText?: string | null
  customerId?: string | null
  label?: string
}

export function DiagnosisGenerateButton({ token, sourceType, sourceId, sourceText, customerId, label = 'AI診断を生成' }: Props) {
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function generate() {
    setMessage('')
    startTransition(async () => {
      const response = await fetch('/api/ai-secretary/diagnosis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ source_type: sourceType, source_id: sourceId, source_text: sourceText, customer_id: customerId }),
      })
      if (response.ok) {
        setMessage('生成しました')
        window.location.reload()
      } else {
        const result = await response.json().catch(() => null)
        setMessage(result?.error ? `生成できませんでした: ${result.error}` : '生成できませんでした')
      }
    })
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button type="button" onClick={generate} disabled={isPending} className="rounded-full bg-gray-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
        {isPending ? '診断中...' : label}
      </button>
      {message && <span className="text-xs font-bold text-green-700">{message}</span>}
    </div>
  )
}
