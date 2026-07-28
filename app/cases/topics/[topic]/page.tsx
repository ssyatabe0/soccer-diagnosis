import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CaseSeoLanding } from '@/components/cases/CaseSeoLanding'
import { caseTopics, getCaseTopic } from '@/data/case-topics'
import { type SoccerCase } from '@/data/cases'
import { getPublicCases } from '@/lib/cases/public-cases'

type Props = { params: Promise<{ topic: string }> }
const baseUrl = 'https://soccer-diagnosis.vercel.app'

export function generateStaticParams() {
  return caseTopics.map((topic) => ({ topic: topic.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic: slug } = await params
  const topic = getCaseTopic(slug)
  if (!topic) return {}
  const canonical = `${baseUrl}/cases/topics/${topic.slug}`
  return {
    title: `${topic.title}｜サッカー症例データベース`,
    description: topic.description,
    keywords: topic.queries,
    alternates: { canonical },
    openGraph: {
      title: topic.title,
      description: topic.description,
      url: canonical,
      type: 'website',
      images: ['/cases/og.png'],
    },
  }
}

export default async function CaseTopicPage({ params }: Props) {
  const { topic: slug } = await params
  const topic = getCaseTopic(slug)
  if (!topic) notFound()
  const publicCases = await getPublicCases()
  const stopWords = new Set(['サッカー', 'できない', '苦手', '改善', '試合'])
  const queryTerms = topic.queries
    .flatMap((query) => query.toLowerCase().split(/\s+/))
    .filter((term) => term.length >= 2 && !stopWords.has(term))
  const cases = publicCases.filter((item) => {
    if (topic.caseSlugs.includes(item.slug)) return true
    const haystack = [
      item.title.ja,
      item.symptom.ja,
      item.diagnosis?.ja,
      item.treatment?.ja,
      item.tags.ja,
    ].filter(Boolean).join(' ').toLowerCase()
    return queryTerms.some((term) => haystack.includes(term))
  }).filter((item): item is SoccerCase => Boolean(item))
  const canonical = `${baseUrl}/cases/topics/${topic.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonical}#page`,
        name: topic.title,
        description: topic.description,
        url: canonical,
        inLanguage: 'ja',
        isPartOf: { '@type': 'WebSite', name: 'サッカー症例データベース', url: 'https://soccer-kateikyousi.com/cases/' },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: cases.length,
          itemListElement: cases.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.title.ja,
            url: `${baseUrl}/cases/${item.slug}`,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '症例データベース', item: 'https://soccer-kateikyousi.com/cases/' },
          { '@type': 'ListItem', position: 2, name: topic.shortTitle, item: canonical },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <CaseSeoLanding
        title={topic.title}
        description={topic.description}
        intro={topic.intro}
        queries={topic.queries}
        cases={cases}
        currentTopic={topic.slug}
      />
    </>
  )
}
