import { soccerCases } from '@/data/cases'

function xml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const items = soccerCases
    .slice()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((item) => `<item>
  <title>${xml(item.title.ja)}</title>
  <link>https://soccer-diagnosis.vercel.app/cases/${xml(item.slug)}</link>
  <guid isPermaLink="true">https://soccer-diagnosis.vercel.app/cases/${xml(item.slug)}</guid>
  <pubDate>${new Date(item.updated_at).toUTCString()}</pubDate>
  <description>${xml(item.symptom.ja)}</description>
</item>`)
    .join('\n')

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>サッカー症例データベース</title>
  <link>https://soccer-kateikyousi.com/cases/</link>
  <description>症状・原因・診断・処方・改善・再現性から探せるサッカー技術の症例データベース</description>
  <language>ja</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  ${items}
</channel>
</rss>`, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
