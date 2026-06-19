'use client'

import { useState, useTransition } from 'react'

type Candidate = {
  id: number
  candidate_date: string
  lesson_title: string | null
  suggested_used_count: number
  status: string
  ai_reason: string | null
  product_name: string | null
  remaining_count: number | null
}

export function CalendarUsageCandidateActions({ token, candidates }: { token: string; candidates: Candidate[] }) {
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function updateCandidate(id: number, action: 'confirm' | 'dismiss') {
    setMessage('')
    startTransition(async () => {
      const response = await fetch(`/api/ai-secretary/calendar-usage-candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      })
      const result = await response.json().catch(() => null)
      if (response.ok) {
        setMessage(action === 'confirm' ? '回数券消化を確定しました' : '候補を却下しました')
        window.location.reload()
      } else {
        setMessage(result?.error ? `更新できませんでした: ${result.error}` : '更新できませんでした')
      }
    })
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-black text-gray-900">回数券消化候補</h3>
          <p className="mt-1 text-xs text-gray-500">Googleカレンダーの実施済み予定から作成。谷田部確認後にだけ消化確定します。</p>
        </div>
        {message && <p className="rounded-full bg-green-50 px-3 py-2 text-xs font-bold text-green-700">{message}</p>}
      </div>
      <div className="mt-4 space-y-3">
        {candidates.map((candidate) => (
          <div key={candidate.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">確認待ち</span>
              <span className="text-xs font-bold text-gray-500">{candidate.candidate_date}</span>
              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">{candidate.suggested_used_count}回候補</span>
            </div>
            <p className="mt-3 font-black text-gray-900">{candidate.lesson_title || 'カレンダー予定'}</p>
            <p className="mt-1 text-sm text-gray-600">{candidate.product_name || '契約未選択'} / 残{candidate.remaining_count ?? '-'}回</p>
            {candidate.ai_reason && <p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm leading-7 text-blue-900">{candidate.ai_reason}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => updateCandidate(candidate.id, 'confirm')} disabled={isPending} className="rounded-full bg-green-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">確認して消化確定</button>
              <button type="button" onClick={() => updateCandidate(candidate.id, 'dismiss')} disabled={isPending} className="rounded-full border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 disabled:opacity-50">候補から外す</button>
            </div>
          </div>
        ))}
        {candidates.length === 0 && <p className="text-sm text-gray-500">確認待ちの回数券消化候補はありません。</p>}
      </div>
    </section>
  )
}
