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

      const normalized = text.replace(/\s/g, '');

      let type: string | null = null;

      const match = normalized.match(/タイプ[:：]\s*([^ID]+)/);
      if (match) type = match[1];

      if (!type) {
        if (normalized.includes('温存')) type = '温存型';
        else if (normalized.includes('受け身')) type = '受け身型';
        else if (normalized.includes('後手')) type = '後手型';
        else if (normalized.includes('突進')) type = '突進型';
        else if (normalized.includes('遠慮')) type = '遠慮型';
        else if (normalized.includes('焦り')) type = '焦り型';
        else if (normalized.includes('迷い')) type = '迷い型';
        else if (normalized.includes('単調')) type = '単調型';
        else if (normalized.includes('視野')) type = '視野不足型';
        else if (normalized.includes('判断')) type = '判断遅れ型';
        else if (normalized.includes('雑')) type = '雑プレー型';
        else if (normalized.includes('自信')) type = '自信不足型';
      }

      const CTA = `
さらに具体的な改善方法は

個別で 全国対応オンライン診断
https://wp.me/P6mCSs-9B3 

対面でのスタート診断 
https://wp.me/P6mCSs-8Zp 

診断と解決は 
https://soccer-kateikyousi.com/ 
お気軽にご相談ください。
`;

      let replyText = '';

      // =========================
      // ① 温存型
      // =========================
      if (type === '温存型') {
        replyText = `診断結果の続きです。

あなたは「技術あるのに出せない状態」です。

原因
・判断が遅い
・安全な選択に逃げる
・考えすぎている

改善
▶先に動く
▶先に触る
▶考える前にプレーする

これだけで一気に変わります。
${CTA}`;
      }

      // =========================
      // ② 受け身型
      // =========================
      else if (type === '受け身型') {
        replyText = `診断結果の続きです。

「待ってしまう」ことが原因です。

・ボールが来てから動く
・見てから判断する

改善
▶ボールが来る前に動く
▶次を先に決める

これで別人になります。
${CTA}`;
      }

      // =========================
      // ③ 後手型
      // =========================
      else if (type === '後手型') {
        replyText = `診断結果の続きです。

すべてが後手になっています。

・反応が遅い
・準備不足

改善
▶予測する
▶準備を先にする

これだけで改善します。
${CTA}`;
      }

      // =========================
      // ④ 突進型
      // =========================
      else if (type === '突進型') {
        replyText = `診断結果の続きです。

急ぎすぎてプレーが雑です。

・突っ込む
・余裕がない

改善
▶一度止まる
▶状況を見る

これだけでプレーの質が上がります。
${CTA}`;
      }

      // =========================
      // ⑤ 遠慮型
      // =========================
      else if (type === '遠慮型') {
        replyText = `診断結果の続きです。

周りに合わせすぎています。

・遠慮
・判断が遅れる

改善
▶自分で決める
▶迷わない

これで変わります。
${CTA}`;
      }

      // =========================
      // ⑥ 焦り型
      // =========================
      else if (type === '焦り型') {
        replyText = `診断結果の続きです。

焦りが原因です。

・プレーが早すぎる
・雑になる

改善
▶落ち着く
▶ゆっくり判断

これで安定します。
${CTA}`;
      }

      // =========================
      // ⑦ 迷い型
      // =========================
      else if (type === '迷い型') {
        replyText = `診断結果の続きです。

迷いが原因です。

・判断が遅い
・優柔不断

改善
▶最初の選択を信じる
▶シンプルに

これで変わります。
${CTA}`;
      }

      // =========================
      // ⑧ 単調型
      // =========================
      else if (type === '単調型') {
        replyText = `診断結果の続きです。

プレーが単調です。

改善
▶選択肢を増やす
▶変化をつける

これで崩せます。
${CTA}`;
      }

      // =========================
      // ⑨ 視野不足型
      // =========================
      else if (type === '視野不足型') {
        replyText = `診断結果の続きです。

周りが見えていません。

改善
▶首振り
▶受ける前に見る

これで変わります。
${CTA}`;
      }

      // =========================
      // ⑩ 判断遅れ型
      // =========================
      else if (type === '判断遅れ型') {
        replyText = `診断結果の続きです。

判断が遅いです。

改善
▶受ける前に決める
▶シンプル優先

これで改善します。
${CTA}`;
      }

      // =========================
      // ⑪ 雑プレー型
      // =========================
      else if (type === '雑プレー型') {
        replyText = `診断結果の続きです。

プレーが雑です。

改善
▶丁寧に扱う
▶落ち着く

これで変わります。
${CTA}`;
      }

      // =========================
      // ⑫ 自信不足型
      // =========================
      else if (type === '自信不足型') {
        replyText = `診断結果の続きです。

自信のなさが原因です。

改善
▶成功体験を増やす
▶簡単なプレーから

これで変わります。
${CTA}`;
      }

      else {
        replyText = `タイプが取得できません。

「突進型」など一言送ってください。`;
      }

      await fetch('https://api.line.me/v2/bot/message/reply', {
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
    }

    return NextResponse.json({ status: 'ok' });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'error' }, { status: 500 });
  }
}