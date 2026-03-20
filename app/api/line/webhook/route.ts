import { NextRequest, NextResponse } from 'next/server';
import { handleLineWebhook } from '@/lib/line';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await handleLineWebhook(body);
    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ error: 'webhook error' }, { status: 500 });
  }
}
