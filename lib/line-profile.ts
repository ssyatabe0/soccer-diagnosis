type LineProfile = {
  displayName?: string
  pictureUrl?: string
  statusMessage?: string
}

const ACCOUNT_TOKEN_ENV: Record<string, string[]> = {
  soccer_private_lesson: ['LINE_CHANNEL_ACCESS_TOKEN_SOCCER_PRIVATE_LESSON', 'LINE_CHANNEL_ACCESS_TOKEN'],
  japan_kids_soccer_club: ['LINE_CHANNEL_ACCESS_TOKEN_JAPAN_KIDS_SOCCER_CLUB'],
  sysc_team_broadcast: ['LINE_CHANNEL_ACCESS_TOKEN_SYSC_TEAM_BROADCAST'],
  sysc_inquiry_news: ['LINE_CHANNEL_ACCESS_TOKEN_SYSC_INQUIRY_NEWS'],
  dribble_school: ['LINE_CHANNEL_ACCESS_TOKEN_DRIBBLE_SCHOOL'],
}

function normalizeAccountKey(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
}

export function getLineChannelAccessToken(accountKey: string | null | undefined) {
  const normalized = normalizeAccountKey(accountKey)
  const envNames = ACCOUNT_TOKEN_ENV[normalized] || []
  for (const envName of envNames) {
    const value = process.env[envName]
    if (value && value !== 'placeholder') return value
  }
  const fallback = process.env.LINE_CHANNEL_ACCESS_TOKEN
  return fallback && fallback !== 'placeholder' ? fallback : ''
}

export async function fetchLineProfile(accountKey: string, lineUserId: string): Promise<LineProfile | null> {
  const token = getLineChannelAccessToken(accountKey)
  if (!token || !lineUserId) return null

  try {
    const response = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(lineUserId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!response.ok) return null
    const profile = await response.json() as LineProfile
    return profile.displayName ? profile : null
  } catch (error) {
    console.error('line profile fetch error:', error)
    return null
  }
}
