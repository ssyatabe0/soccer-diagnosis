import { NextRequest, NextResponse } from 'next/server'
import { cleanText, getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'
import { draftReply, matchService, nextAction, summarizeText } from '@/lib/ai-secretary/intelligence'

type GmailPayload = {
  gmail_message_id?: string
  thread_id?: string
  from_email?: string
  to_email?: string
  subject?: string
  snippet?: string
  body?: string
  occurred_at?: string
  needs_reply?: boolean
}

export async function POST(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })

  const body = await request.json().catch(() => null)
  const messages = Array.isArray(body?.messages) ? body.messages as GmailPayload[] : []
  if (messages.length === 0) return NextResponse.json({ error: 'messages_required' }, { status: 400 })

  const { data: customers } = await supabase.from('customers').select('id,full_name,parent_name,child_name,email,service_type,status')
  const imported = []

  for (const message of messages.slice(0, 100)) {
    const text = [message.from_email, message.subject, message.snippet, message.body].filter(Boolean).join('\n')
    const matched = (customers || []).find((customer) => {
      const haystack = [customer.full_name, customer.parent_name, customer.child_name, customer.email].filter(Boolean).join(' ').toLowerCase()
      return haystack && text.toLowerCase().includes(haystack)
    })
    const customerId = matched?.id || null
    const summary = summarizeText(text, 'Gmail問い合わせ')
    const reply = draftReply('email', [message.subject, message.snippet || message.body || ''].filter(Boolean).join('\n'))

    const { data, error } = await supabase.from('gmail_sync_sources').upsert({
      customer_id: customerId,
      gmail_message_id: cleanText(message.gmail_message_id, 200) || `manual-${Date.now()}-${imported.length}`,
      thread_id: cleanText(message.thread_id, 200),
      from_email: cleanText(message.from_email, 500),
      to_email: cleanText(message.to_email, 500),
      subject: cleanText(message.subject, 1000),
      snippet: cleanText(message.snippet || message.body, 5000),
      direction: 'inbound',
      status: 'needs_review',
      needs_reply: message.needs_reply ?? true,
      ai_summary: summary,
      ai_reply_draft: reply,
      occurred_at: cleanText(message.occurred_at, 80) || new Date().toISOString(),
      raw_payload: { ...message, service_hint: matchService(text), next_action: nextAction(text) },
    }, { onConflict: 'gmail_message_id' }).select('*').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (customerId) {
      await supabase.from('customer_timeline_events').insert({
        customer_id: customerId,
        event_type: 'gmail',
        title: `Gmail: ${message.subject || '問い合わせ'}`,
        body: summary,
        source: 'gmail',
        source_table: 'gmail_sync_sources',
        source_id: String(data.id),
        occurred_at: data.occurred_at || new Date().toISOString(),
      })
      await supabase.from('customers').update({ last_contact_at: data.occurred_at || new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', customerId)
    }
    imported.push(data)
  }

  return NextResponse.json({ status: 'ok', count: imported.length, items: imported })
}
