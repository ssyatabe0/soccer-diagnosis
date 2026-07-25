import './cases.css'
import { CaseShell } from '@/components/cases/CaseShell'

export default function CasesLayout({ children }: { children: React.ReactNode }) {
  return <CaseShell locale="ja">{children}</CaseShell>
}
