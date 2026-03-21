import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = body.events || [];

    for (const event of events) {
      if (event.type !== 'message') continue;
      if (event.message?.type !== 'text') continue;

      const text = event.message.text || '';
      const replyToken = event.replyToken;

      const normalized = text.replace(/\s/g, '').replace(/　/g, '');

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

      let replyText = '';

      if (type === '先に急ぎすぎる突進型') {
        replyText = `診断結果の続きをお伝えします。

このタイプは「改善ポイントが明確」なので、ここから一気に変わります。

急ぎすぎてプレーが雑になっています。

・突っ込む
・余裕がない

改善
▶ 一度止まる
▶ 状況を見る

これだけでプレーの質が上がります。`;
      } else if (type === '周りに合わせすぎる遠慮型') {
        replyText = `診断結果の続きをお伝えします。

周りに合わせすぎて自分の良さが消えています。

・遠慮する
・判断が遅れる

改善
▶ 自分で決める
▶ 早く選択する

これだけで一気に変わります。`;
      } else if (type === '技術あるのに出せない温存型') {
        replyText = `診断結果の続きをお伝えします。

技術はあるのに試合で出せていません。

原因は「自分に許可を出せていないこと」です。

改善
▶ 自分にOKを出す
▶ 思い切って使う

これで一気に変わります。`;
      } else {
        replyText = '受信OK（テスト成功）';
      }

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
      console.log('REPLY SENT');
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('ERROR:', e);
    return NextResponse.json({ error: 'err' }, { status: 500 });
  }
}