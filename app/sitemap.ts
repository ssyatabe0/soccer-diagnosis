import type { MetadataRoute } from 'next'
import { soccerCases } from '@/data/cases'

const baseUrl = 'https://soccer-diagnosis.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date('2026-07-25T00:00:00+09:00')
  return [
    { url: baseUrl, lastModified: updated, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/diagnosis`, lastModified: updated, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/en/cases`, lastModified: updated, changeFrequency: 'weekly', priority: 0.8 },
    ...soccerCases.map((item) => ({
        url: `${baseUrl}/en/cases/${item.slug}`,
        lastModified: new Date(item.updated_at),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
  ]
}
