import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = body.events || [];

    for (const event of events) {
      if (event.type !== 'message') continue;
      if (event.message.type !== 'text') continue;

      const text = event.message.text || '';
      const replyToken = event.replyToken;

      // =========================
      // ▼絶対にここだけで完結させる
      // =========================

      const normalized = text.replace(/\s/g, '').replace(/　/g, '');

      let type = null;

      const match = normalized.match(/タイプ[:：]?(.+?)型/);
      if (match) type = match[1] + '型';

      if (!type) {
        if (normalized.includes('突進型')) type = '先に急ぎすぎる突進型';
        if (normalized.includes('遠慮型')) type = '周りに合わせすぎる遠慮型';
        if (normalized.includes('温存型')) type = '技術あるのに出せない温存型';
      }

      let replyText = '';

      if (type === '先に急ぎすぎる突進型') {
        replyText = '突進型の改善は「一度止まる→状況を見る」これだけでOK';
      } else if (type === '周りに合わせすぎる遠慮型') {
        replyText = '遠慮型は「自分で決める」これだけで変わる';
      } else if (type === '技術あるのに出せない温存型') {
        replyText = '温存型は「自分にOK出す」だけで変わる';
      } else {
        replyText = '受信OK（テスト成功）';
      }

      // =========================
      // ▼ここで1回だけ返信
      // =========================

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

      console.log('====== RESULT ======');
      console.log('text:', text);
      console.log('normalized:', normalized);
      console.log('type:', type);
      console.log('status:', res.status);
      console.log('body:', resText);

      // ★ここ重要（絶対これ入れる）
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'err' }, { status: 500 });
  }
}
