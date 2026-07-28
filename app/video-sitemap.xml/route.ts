import { getPublicCases } from '@/lib/cases/public-cases'
import { getCanonicalCaseUrl } from '@/data/cases'

function xml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const publicCases = await getPublicCases()
  const rows = publicCases
    .filter((item) => item.comparison_video)
    .map((item) => {
      const id = item.comparison_video as string
      const pageUrl = getCanonicalCaseUrl(item)
      const description = [item.symptom.ja, item.result?.ja].filter(Boolean).join('。')
      return `<url>
  <loc>${xml(pageUrl)}</loc>
  <video:video>
    <video:thumbnail_loc>${xml(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)}</video:thumbnail_loc>
    <video:title>${xml(item.title.ja)}</video:title>
    <video:description>${xml(description)}</video:description>
    <video:player_loc allow_embed="yes">${xml(`https://www.youtube.com/embed/${id}`)}</video:player_loc>
    <video:publication_date>${xml(item.created_at)}</video:publication_date>
    <video:family_friendly>yes</video:family_friendly>
  </video:video>
</url>`
    })
    .join('\n')

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${rows}
</urlset>`, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
