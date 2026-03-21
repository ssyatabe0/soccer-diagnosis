import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

  console.log('WEBHOOK START');
  console.log('TOKEN length:', TOKEN.length);

  const raw = await request.text();
  console.log('raw:', raw.slice(0, 300));

  const events = JSON.parse(raw).events || [];
  console.log('events:', events.length);

  for (const ev of events) {
    console.log('event.type:', ev.type);
    console.log('message.type:', ev.message?.type);
    console.log('message.text:', ev.message?.text);
    console.log('replyToken:', ev.replyToken);

    if (ev.type !== 'message' || ev.message?.type !== 'text') continue;

    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        replyToken: ev.replyToken,
        messages: [{ type: 'text', text: '受信しました' }],
      }),
    });

    const body = await res.text();
    console.log('reply status:', res.status);
    console.log('reply body:', body);
  }

  console.log('WEBHOOK END');
  return NextResponse.json({ status: 'ok' });
}
