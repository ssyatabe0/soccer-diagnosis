import '../../cases/cases.css'
import { CaseShell } from '@/components/cases/CaseShell'

export default function EnglishCasesLayout({ children }: { children: React.ReactNode }) {
  return <CaseShell locale="en">{children}</CaseShell>
}
