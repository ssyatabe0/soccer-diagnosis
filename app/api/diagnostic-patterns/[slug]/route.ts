import { getDiagnosticPattern } from '@/data/diagnostic-patterns'

export const dynamic = 'force-static'

export async function GET(_request: Request, context: RouteContext<'/api/diagnostic-patterns/[slug]'>) {
  const { slug } = await context.params
  const pattern = getDiagnosticPattern(slug)

  if (!pattern) {
    return Response.json({ error: 'Diagnostic pattern not found' }, { status: 404 })
  }

  return Response.json({
    schema_version: '0.1.0',
    purpose: 'Reusable Yatabe diagnostic reasoning pattern',
    pattern,
  })
}
