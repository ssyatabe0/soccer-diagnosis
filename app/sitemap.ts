import type { MetadataRoute } from 'next'
import { categoryLabels, soccerCases, type CaseCategory } from '@/data/cases'
import { caseTopics } from '@/data/case-topics'

const baseUrl = 'https://soccer-diagnosis.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date('2026-07-25T00:00:00+09:00')
  return [
    { url: baseUrl, lastModified: updated, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/diagnosis`, lastModified: updated, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/en/cases`, lastModified: updated, changeFrequency: 'weekly', priority: 0.8 },
    ...caseTopics.map((topic) => ({
      url: `${baseUrl}/cases/topics/${topic.slug}`,
      lastModified: updated,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...(Object.keys(categoryLabels) as CaseCategory[])
      .filter((category) => soccerCases.some((item) => item.category.includes(category)))
      .map((category) => ({
        url: `${baseUrl}/cases/category/${category}`,
        lastModified: updated,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
    ...soccerCases.flatMap((item) => [{
        url: `${baseUrl}/cases/${item.slug}`,
        lastModified: new Date(item.updated_at),
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      }, {
        url: `${baseUrl}/en/cases/${item.slug}`,
        lastModified: new Date(item.updated_at),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }]),
  ]
}
