import { NextRequest, NextResponse } from 'next/server'
import { cleanText, getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAiSecretaryAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })
  const { id } = await params
  const body = await request.json().catch(() => null)
  const status = cleanText(body?.status, 40)
  const notes = cleanText(body?.notes)
  const allowed = ['draft', 'created', 'ready_to_send', 'sent', 'checking', 'waiting_signature', 'signed', 'cancelled', 'expired']
  if (status && !allowed.includes(status)) return NextResponse.json({ error: 'invalid_status' }, { status: 400 })

  const updates: Record<string, string | null> = { updated_at: new Date().toISOString() }
  if (status) updates.status = status
  if (Object.prototype.hasOwnProperty.call(body || {}, 'notes')) updates.notes = notes
  if (status === 'ready_to_send') updates.ready_at = new Date().toISOString()

  const { data, error } = await supabase.from('contract_documents').update(updates).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ status: 'ok', document: data })
}
