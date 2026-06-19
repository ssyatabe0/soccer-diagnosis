import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAiSecretaryAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })
  const { id } = await params
  const { data, error } = await supabase.from('contract_documents').select('file_name,content_type,pdf_base64').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const bytes = Buffer.from(data.pdf_base64 || '', 'base64')
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': data.content_type || 'application/pdf',
      'Content-Disposition': `attachment; filename="${data.file_name || `contract-${id}.pdf`}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
