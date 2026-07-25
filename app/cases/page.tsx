import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'

const canonical = 'https://soccer-kateikyousi.com/cases/'

export const metadata: Metadata = {
  title: 'サッカー症例データベース｜悩みを症例から探す',
  description: 'シュート、トラップ、ドリブル、1対1などの悩みを、症状・原因・処方・改善記録から探せるサッカー技術の臨床データベースβ版。',
  alternates: {
    canonical,
    languages: {
      ja: canonical,
      en: 'https://soccer-diagnosis.vercel.app/en/cases',
    },
  },
  openGraph: {
    title: 'サッカーの悩みを、症例から探す。',
    description: '何を練習するかではなく、なぜできないのかから考える。',
    url: canonical,
    type: 'website',
    images: [{ url: '/cases/og.png', width: 1200, height: 630, alt: 'サッカーの悩みを、症例から探す。' }],
  },
}

export default function CasesPage() {
  permanentRedirect(canonical)
}
