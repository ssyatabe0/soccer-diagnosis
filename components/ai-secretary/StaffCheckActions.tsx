'use client'

import { useState } from 'react'

export function StaffCheckCopyButton({ text, label = 'コピー' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function copyText() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <button
      type="button"
      onClick={copyText}
      className="rounded-full bg-gray-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-gray-800"
    >
      {copied ? 'コピー済み' : label}
    </button>
  )
}

export function StaffNotifyButton({ lineInboxId, token }: { lineInboxId: number; token: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function notifyStaff() {
    setStatus('sending')
    setMessage('')

    try {
      const response = await fetch(`/api/ai-secretary/staff-checks?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_inbox_id: lineInboxId }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok || !result.ok) {
        setStatus('error')
        setMessage(result.error || result.push?.error || 'スタッフ通知に失敗しました')
        return
      }

      setStatus('sent')
      setMessage(`${result.target?.name || 'スタッフ'}へ通知しました`)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'スタッフ通知に失敗しました')
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={notifyStaff}
        disabled={status === 'sending'}
        className="rounded-full bg-green-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {status === 'sending' ? '通知中' : status === 'sent' ? '通知済み' : 'スタッフへLINE通知'}
      </button>
      {message && (
        <p className={`max-w-xs text-right text-[11px] font-bold ${status === 'error' ? 'text-red-600' : 'text-green-700'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
