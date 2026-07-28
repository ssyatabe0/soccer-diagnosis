import type { Metadata } from 'next'
import '../../cases/cases.css'
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

export default function EnglishCasesLayout({ children }: { children: React.ReactNode }) {
  return <CaseShell locale="en">{children}</CaseShell>
}
