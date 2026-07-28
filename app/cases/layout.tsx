import type { Metadata } from 'next'
import './cases.css'
import { CaseShell } from '@/components/cases/CaseShell'

export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

export default function CasesLayout({ children }: { children: React.ReactNode }) {
  return <CaseShell locale="ja">{children}</CaseShell>
}
