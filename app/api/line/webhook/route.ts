import { NextRequest, NextResponse } from 'next/server';

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

export async function GET() {
  return NextResponse.json({ ok: true, token: TOKEN ? TOKEN.slice(0, 10) + '...' : 'EMPTY' });
}

export async function POST(request: NextRequest) {
  console.log('=== WEBHOOK START ===');
  console.log('TOKEN set:', !!TOKEN, 'length:', TOKEN.length, 'prefix:', TOKEN.slice(0, 10));

  const rawBody = await request.text();
  console.log('rawBody:', rawBody.slice(0, 500));

  let events: any[] = [];
  try {
    events = JSON.parse(rawBody).events || [];
  } catch (e) {
    console.log('parse error:', e);
    return NextResponse.json({ status: 'ok' });
  }

  console.log('events count:', events.length);

  for (const ev of events) {
    console.log('event.type:', ev.type);
    console.log('message.type:', ev.message?.type);
    console.log('message.text:', ev.message?.text);
    console.log('replyToken:', ev.replyToken);

    if (ev.type !== 'message') continue;
    if (ev.message?.type !== 'text') continue;

    // 固定返信
    const replyBody = JSON.stringify({
      replyToken: ev.replyToken,
      messages: [{ type: 'text', text: 'Webhook受信OK' }],
    });

    console.log('reply request body:', replyBody);

    try {
      const res = await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TOKEN}`,
        },
        body: replyBody,
      });

      const resText = await res.text();
      console.log('reply status:', res.status);
      console.log('reply body:', resText);
    } catch (e: any) {
      console.log('reply fetch error:', e?.message, e?.stack);
    }
  }

  console.log('=== WEBHOOK END ===');
  return NextResponse.json({ status: 'ok' });
}
