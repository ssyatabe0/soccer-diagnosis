import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CaseDetail } from '@/components/cases/CaseDetail'
import { categoryLabels, getCanonicalCaseUrl, getRelatedCases, soccerCases } from '@/data/cases'
import { getPublicCase } from '@/lib/cases/public-cases'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return soccerCases.map((item) => ({ slug: item.slug }))
}

export const dynamicParams = true

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { item } = await getPublicCase(slug)
  if (!item) return {}
  const canonical = getCanonicalCaseUrl(item)
  const grade = item.grade?.ja || (item.age ? `${item.age}歳` : '年齢未入力')
  const summary = [item.symptom.ja, item.result?.ja, item.improvement_time?.ja ? `改善まで${item.improvement_time.ja}` : null]
    .filter(Boolean)
    .join('。')
  return {
    title: `${item.title.ja}｜${grade}のサッカー改善症例`,
    description: `${grade}。${summary}。症状・診断・処方・変化を公開記録と動画で確認できる症例カルテ。`,
    keywords: [...item.tags.ja.split(/\s+/), ...item.category],
    authors: [{ name: '谷田部真之助', url: 'https://soccer-kateikyousi.com/院長紹介/' }],
    alternates: {
      canonical,
      languages: {
        ja: canonical,
        en: `https://soccer-diagnosis.vercel.app/en/cases/${item.slug}`,
      },
    },
    openGraph: {
      title: `${item.title.ja}｜サッカー症例データベース`,
      description: `${grade}。${summary}`,
      url: canonical,
      type: 'article',
      publishedTime: item.created_at,
      modifiedTime: item.updated_at,
      authors: ['谷田部真之助'],
      images: item.comparison_video ? [`https://i.ytimg.com/vi/${item.comparison_video}/hqdefault.jpg`] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: item.title.ja,
      description: `${grade}。${summary}`,
      images: item.comparison_video ? [`https://i.ytimg.com/vi/${item.comparison_video}/hqdefault.jpg`] : undefined,
    },
  }
}

export default async function CasePage({ params }: Props) {
  const { slug } = await params
  const { item, cases } = await getPublicCase(slug)
  if (!item) notFound()
  const index = cases.findIndex((entry) => entry.case_id === item.case_id)
  const canonical = getCanonicalCaseUrl(item)
  const image = item.comparison_video
    ? `https://i.ytimg.com/vi/${item.comparison_video}/hqdefault.jpg`
    : 'https://soccer-diagnosis.vercel.app/cases/og.png'
  const article = {
    '@type': 'Article',
    '@id': `${canonical}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    headline: item.title.ja,
    description: item.symptom.ja,
    image: [image],
    url: canonical,
    inLanguage: 'ja',
    datePublished: item.created_at,
    dateModified: item.updated_at,
    author: {
      '@type': 'Person',
      name: '谷田部真之助',
      url: 'https://soccer-kateikyousi.com/院長紹介/',
    },
    publisher: {
      '@type': 'Organization',
      name: 'サッカー症例データベース',
      url: 'https://soccer-kateikyousi.com/cases/',
    },
    articleSection: item.category.map((category) => categoryLabels[category].ja),
    keywords: item.tags.ja,
    about: item.category.map((category) => ({ '@type': 'Thing', name: categoryLabels[category].ja })),
    citation: item.source_url,
    isPartOf: {
      '@type': 'CollectionPage',
      name: 'サッカー症例データベース',
      url: 'https://soccer-kateikyousi.com/cases/',
    },
  }
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      article,
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '症例データベース', item: 'https://soccer-kateikyousi.com/cases/' },
          { '@type': 'ListItem', position: 2, name: item.title.ja, item: canonical },
        ],
      },
      ...(item.comparison_video ? [{
        '@type': 'VideoObject',
        '@id': `${canonical}#video`,
        name: `${item.title.ja}の改善動画`,
        description: `${item.symptom.ja}。公開症例で確認できる変化を収録した動画。`,
        thumbnailUrl: [image],
        embedUrl: `https://www.youtube.com/embed/${item.comparison_video}`,
        uploadDate: item.created_at,
        inLanguage: 'ja',
        isPartOf: { '@id': `${canonical}#article` },
      }] : []),
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <CaseDetail item={item} related={getRelatedCases(item, cases)} locale="ja" caseNumber={index + 1} />
    </>
  )
}
