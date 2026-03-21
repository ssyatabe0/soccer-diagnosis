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

      const match = normalized.match(/タイプ[:：]([^\n]+)/);
      if (match) type = match[1];

      // キーワード判定（広めに拾う）
      if (!type) {
        if (normalized.includes('突進')) type = '突進型';
        else if (normalized.includes('遠慮')) type = '遠慮型';
        else if (normalized.includes('温存')) type = '温存型';
        else if (normalized.includes('受け身')) type = '受け身型';
        else if (normalized.includes('焦り')) type = '焦り型';
        else if (normalized.includes('迷い')) type = '迷い型';
        else if (normalized.includes('単調')) type = '単調型';
        else if (normalized.includes('視野')) type = '視野不足型';
        else if (normalized.includes('判断遅')) type = '判断遅れ型';
        else if (normalized.includes('雑')) type = '雑プレー型';
        else if (normalized.includes('依存')) type = '依存型';
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

      switch (type) {

        case '突進型':
          replyText = `急ぎすぎてプレーが雑になります

改善
▶ 一度止まる
▶ 状況を見る

これだけで変わります
${CTA}`;
          break;

        case '遠慮型':
          replyText = `周りに合わせすぎています

改善
▶ 自分で決める
▶ 最初の判断を信じる

これで一気に変わります
${CTA}`;
          break;

        case '温存型':
          replyText = `技術はあるのに出せていません

改善
▶ 最初のタッチで前へ
▶ 迷う前に出す

これで変わります
${CTA}`;
          break;

        case '受け身型':
          replyText = `待ちすぎてチャンスを逃しています

改善
▶ 自分から関わる
▶ 先に動く

これで改善します
${CTA}`;
          break;

        case '焦り型':
          replyText = `焦りで判断が乱れています

改善
▶ 呼吸
▶ ワンタッチ減らす

これで安定します
${CTA}`;
          break;

        case '迷い型':
          replyText = `判断に迷いが出ています

改善
▶ 最初の選択を優先
▶ シンプルにする

これで改善します
${CTA}`;
          break;

        case '単調型':
          replyText = `プレーがワンパターンです

改善
▶選択肢を増やす
▶同じ動きを繰り返さない

これで変わります
${CTA}`;
          break;

        case '視野不足型':
          replyText = `周囲が見えていません

改善
▶受ける前に見る
▶首振りを増やす

これで改善します
${CTA}`;
          break;

        case '判断遅れ型':
          replyText = `判断が遅れています

改善
▶受ける前に決める
▶シンプル優先

これで変わります
${CTA}`;
          break;

        case '雑プレー型':
          replyText = `プレーが雑になっています

改善
▶丁寧に扱う
▶スピードより質

これで改善します
${CTA}`;
          break;

        case '依存型':
          replyText = `周りに頼りすぎています

改善
▶自分で突破
▶自分で判断

これで変わります
${CTA}`;
          break;

        case '自信不足型':
          replyText = `自信のなさが出ています

改善
▶成功体験を増やす
▶簡単なプレーから

これで改善します
${CTA}`;
          break;

        default:
          replyText = `タイプがうまく取得できません

「突進型」など一言送ってください`;
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