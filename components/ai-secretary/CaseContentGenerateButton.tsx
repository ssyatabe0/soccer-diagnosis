'use client'

import { useState, useTransition } from 'react'

type Props = {
  token: string
  caseId: string
  contentType: string
  label: string
}

export function CaseContentGenerateButton({ token, caseId, contentType, label }: Props) {
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function generate() {
    setMessage('')
    startTransition(async () => {
      const response = await fetch('/api/ai-secretary/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ case_id: caseId, content_type: contentType }),
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
      <button type="button" onClick={generate} disabled={isPending} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm hover:border-green-300 disabled:opacity-50">
        {isPending ? '生成中...' : label}
      </button>
      {message && <span className="text-xs font-bold text-green-700">{message}</span>}
    </div>
  )
}
