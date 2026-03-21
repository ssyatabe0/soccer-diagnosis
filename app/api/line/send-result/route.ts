import { NextRequest, NextResponse } from 'next/server';
import { getReplyByTypeName } from '@/lib/line-result-templates';

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lineUserId, displayName, resultId, typeName } = body;

    if (!lineUserId || !resultId || !typeName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!LINE_CHANNEL_ACCESS_TOKEN || LINE_CHANNEL_ACCESS_TOKEN === 'placeholder') {
      return NextResponse.json({ error: 'LINE未設定' }, { status: 500 });
    }

    const replyBody = getReplyByTypeName(typeName);
    const greeting = `${displayName || ''}さん、診断ありがとうございます！`;

    const messages = [
      { type: 'text', text: greeting },
      { type: 'text', text: replyBody.slice(0, 5000) },
    ];

    const res = await fetch(LINE_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ to: lineUserId, messages }),
    });

    if (!res.ok) {
      console.error('LINE push failed:', res.status, await res.text());
      return NextResponse.json({ error: 'LINE送信失敗' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('send-result error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
