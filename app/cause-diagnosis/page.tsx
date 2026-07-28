import type { Metadata } from 'next'
import { CauseDiagnosisMvp } from '@/components/cause-diagnosis/CauseDiagnosisMvp'

const canonical = 'https://soccer-diagnosis.vercel.app/cause-diagnosis'

export const metadata: Metadata = {
  title: '動画AI原因診断｜観察事実・原因候補・確認テストを出す',
  description: 'サッカー動画から観察事実を抽出し、技術的な原因候補を根拠・確信度・確認テスト・関連症例付きで整理するAI原因診断MVP。',
  alternates: { canonical },
  robots: { index: true, follow: true },
  openGraph: {
    title: '動画から、原因候補を絞る。',
    description: '性格診断でも声かけ生成でもない、サッカー技術のAI原因診断MVP。',
    url: canonical,
    type: 'website',
  },
}

export default function CauseDiagnosisPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '動画AI原因診断MVP',
    url: canonical,
    applicationCategory: 'SportsApplication',
    operatingSystem: 'Web',
    inLanguage: 'ja',
    description: 'サッカー動画から観察事実を抽出し、原因候補を根拠・確認テスト・関連症例付きで整理するAI原因診断。',
    isPartOf: {
      '@type': 'WebSite',
      name: 'サッカー症例データベース',
      url: 'https://soccer-kateikyousi.com/cases/',
    },
    featureList: [
      '動画フレームから観察事実を抽出',
      '根拠ID付きの原因候補',
      '原因候補ごとの確認テスト',
      '実在する公開症例との関連付け',
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <CauseDiagnosisMvp />
    </>
  )
}
