type LinePushResult = {
  ok: boolean
  status?: number
  error?: string
}

export function getLineChannelAccessToken(accountKey: string) {
  const envKey = `LINE_CHANNEL_ACCESS_TOKEN_${accountKey.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
  const directToken = process.env[envKey]
  if (directToken) return directToken

  const rawMap = process.env.LINE_CHANNEL_ACCESS_TOKEN_MAP
  if (rawMap) {
    try {
      const map = JSON.parse(rawMap) as Record<string, string>
      if (map[accountKey]) return map[accountKey]
    } catch {
      // Fall back to the legacy single-account token below.
    }
  }

  return process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
}

export async function pushLineTextMessage(accountKey: string, to: string, text: string): Promise<LinePushResult> {
  const token = getLineChannelAccessToken(accountKey)
  if (!token) return { ok: false, error: `LINE token is missing for ${accountKey}` }
  if (!to) return { ok: false, error: 'LINE user id is missing' }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to,
        messages: [{ type: 'text', text }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      return { ok: false, status: response.status, error: errorText || response.statusText }
    }

    return { ok: true, status: response.status }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'LINE push failed' }
  }
}
