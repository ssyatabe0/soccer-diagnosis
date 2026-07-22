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
