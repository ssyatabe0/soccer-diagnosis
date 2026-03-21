import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('🔥 NEW CODE RUNNING');

  try {
    const body = await req.json();
    console.log('body:', JSON.stringify(body));

    const events = body.events || [];
    console.log('events length:', events.length);

    for (const event of events) {
      console.log('event.type:', event?.type);
      console.log('message.type:', event?.message?.type);

      if (event.type !== 'message') continue;
      if (event.message?.type !== 'text') continue;

      const text = event.message.text || '';
      const replyToken = event.replyToken || '';

      console.log('text:', text);
      console.log('replyToken exists:', !!replyToken);

      const normalized = text.replace(/\s/g, '').replace(/　/g, '');
      console.log('normalized:', normalized);

      let type: string | null = null;

      const match = normalized.match(/タイプ[:：]?(.+?)型/);
      if (match) {
        type = match[1] + '型';
      }

      if (!type) {
        if (normalized.includes('突進型')) type = '先に急ぎすぎる突進型';
        if (normalized.includes('遠慮型')) type = '周りに合わせすぎる遠慮型';
        if (normalized.includes('温存型')) type = '技術あるのに出せない温存型';
      }

      console.log('type:', type);

      let replyText = '';

      if (type === '先に急ぎすぎる突進型') {
        replyText = '突進型の改善は「一度止まる→状況を見る」これだけでOK';
      } else if (type === '周りに合わせすぎる遠慮型') {
        replyText = '遠慮型は「自分で決める」これだけで変わる';
      } else if (type === '技術あるのに出せない温存型') {
        replyText = '温存型は「自分にOKを出す」だけで変わる';
      } else {
        replyText = '受信OK（テスト成功）';
      }

      console.log('replyText:', replyText);

      const res = await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          replyToken,
          messages: [{ type: 'text', text: replyText }],
        }),
      });

      const resText = await res.text();

      console.log('status:', res.status);
      console.log('body:', resText);
      console.log('REPLY SENT');
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('ERROR:', e);
    return NextResponse.json({ error: 'err' }, { status: 500 });
  }
}