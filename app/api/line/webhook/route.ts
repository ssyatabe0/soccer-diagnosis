import { NextRequest, NextResponse } from 'next/server';

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

function detectType(text: string): string | null {
  const normalized = text
    .replace(/\r/g, '')
    .replace(/\n/g, '')
    .replace(/\s/g, '')
    .replace(/　/g, '')
    .replace(/：/g, ':');

  const patterns: Array<{ keys: string[]; type: string }> = [
    {
      keys: ['技術あるのに出せない温存型', '温存型'],
      type: '技術あるのに出せない温存型',
    },
    {
      keys: ['最初の一歩が遅れる受け身型', '受け身型'],
      type: '最初の一歩が遅れる受け身型',
    },
    {
      keys: ['ボール受ける前で負ける後手型', '後手型'],
      type: 'ボール受ける前で負ける後手型',
    },
    {
      keys: ['周りに合わせすぎる遠慮型', '遠慮型'],
      type: '周りに合わせすぎる遠慮型',
    },
    {
      keys: ['先に急ぎすぎる突進型', '突進型'],
      type: '先に急ぎすぎる突進型',
    },
    {
      keys: ['ミスを恐れて選択が減る慎重型', '慎重型'],
      type: 'ミスを恐れて選択が減る慎重型',
    },
    {
      keys: ['試合で消えやすい慎重派型', '慎重派型'],
      type: '試合で消えやすい慎重派型',
    },
    {
      keys: ['練習と試合で別人になる分離型', '分離型'],
      type: '練習と試合で別人になる分離型',
    },
    {
      keys: ['1対1で力を隠す安全運転型', '安全運転型'],
      type: '1対1で力を隠す安全運転型',
    },
    {
      keys: ['見えてるのに出せない準備不足型', '準備不足型'],
      type: '見えてるのに出せない準備不足型',
    },
    {
      keys: ['ボール触れは良いのに触れない待機型', '待機型'],
      type: 'ボール触れは良いのに触れない待機型',
    },
    {
      keys: ['頭ではわかってるのに体が合わない思考先行型', '思考先行型'],
      type: '頭ではわかってるのに体が合わない思考先行型',
    },
  ];

  for (const row of patterns) {
    for (const key of row.keys) {
      if (normalized.includes(key.replace(/\s/g, ''))) {
        return row.type;
      }
    }
  }

  return null;
}

function buildReply(type: string): string {
  switch (type) {
    case '技術あるのに出せない温存型':
      return `診断結果の続きをお伝えします。

あなたは「技術はあるのに試合で出せない状態」です。

原因は
・判断が遅い
・安全な選択に逃げる
・プレー前に考えすぎている

改善はシンプルです

▶先に動く
▶先に触る
▶考える前にプレーする

この順番に変えるだけで一気に変わります。
ここは一番伸びやすいゾーンです。
${CTA}`;

    case '最初の一歩が遅れる受け身型':
      return `診断結果の続きをお伝えします。

このタイプは「待ってしまう」ことが原因です。

・ボールが来てから動く
・状況を見てから判断する

これでは遅れます。

改善はこれだけ

▶ボールが来る前に動く
▶次のプレーを先に決める

これができるだけで別人になります。
${CTA}`;

    case 'ボール受ける前で負ける後手型':
      return `診断結果の続きをお伝えします。

このタイプは「受ける前の準備」で負けています。

・見るのが遅い
・立ち位置が遅い
・準備が後手

改善

▶受ける前に首を振る
▶受ける前に立ち位置を作る
▶受ける前に次を決める

受ける前が変わるとプレー全体が変わります。
${CTA}`;

    case '周りに合わせすぎる遠慮型':
      return `診断結果の続きをお伝えします。

このタイプは「周りに合わせすぎる」ことが原因です。

・自分で決めきれない
・遠慮してしまう
・周り優先で自分の武器が消える

改善

▶まず自分の選択を持つ
▶遠慮せず出す
▶自分の強みを先に使う

協調性は武器です。
あとは自分で行く場面を決めれば伸びます。
${CTA}`;

    case '先に急ぎすぎる突進型':
      return `診断結果の続きをお伝えします。

このタイプは「改善ポイントが明確」なので、ここから一気に変わります。

急ぎすぎてプレーが雑になっています。

・突っ込む
・余裕がない

改善

▶一度止まる
▶状況を見る

これだけでプレーの質が上がります。
${CTA}`;

    case 'ミスを恐れて選択が減る慎重型':
      return `診断結果の続きをお伝えします。

このタイプは「ミスを恐れすぎる」ことで選択が減っています。

・無難になる
・逃げる判断が増える
・本来の良さが出ない

改善

▶1回チャレンジを入れる
▶失敗より再現を重視する
▶小さく攻める

慎重さは強みです。
使い方を変えるだけで良さが出ます。
${CTA}`;

    case '試合で消えやすい慎重派型':
      return `診断結果の続きをお伝えします。

このタイプは「試合で存在感が消えやすい」状態です。

・無難に終わる
・関わる回数が減る
・目立たない

改善

▶最初の5分で1回自分から関わる
▶受ける前に立ち位置を取る
▶消える前に1回行く

試合の入り方を変えるだけで印象は大きく変わります。
${CTA}`;

    case '練習と試合で別人になる分離型':
      return `診断結果の続きをお伝えします。

このタイプは「練習と試合で別人」になっています。

・練習ではできる
・試合だと固くなる
・再現できない

改善

▶試合でやることを1つに絞る
▶成功体験を小さく作る
▶練習から試合想定でやる

再現の設計を入れるだけで試合でも出せます。
${CTA}`;

    case '1対1で力を隠す安全運転型':
      return `診断結果の続きをお伝えします。

このタイプは「1対1で力を隠してしまう」状態です。

・勝負しない
・安全に逃げる
・武器が出ない

改善

▶1対1で1回は仕掛ける
▶抜くよりズラす意識を持つ
▶安全の中に勝負を入れる

安全運転を少し変えるだけで武器が見えます。
${CTA}`;

    case '見えてるのに出せない準備不足型':
      return `診断結果の続きをお伝えします。

このタイプは「見えているのに出せない」状態です。

・見えてはいる
・でも体が準備できていない
・出すのが遅れる

改善

▶受ける前に体の向きを作る
▶次の選択肢を先に持つ
▶出せる姿勢で受ける

見えているなら、あとは準備だけです。
ここは伸びます。
${CTA}`;

    case 'ボール触れは良いのに触れない待機型':
      return `診断結果の続きをお伝えします。

このタイプは「触れれば良いのに、触る前で止まる」状態です。

・待ってしまう
・関わりに行かない
・良さが出る前に終わる

改善

▶触りに行く回数を増やす
▶最初の関わりを早くする
▶待つより先に入る

触る回数が増えるだけで、良さは自然に出ます。
${CTA}`;

    case '頭ではわかってるのに体が合わない思考先行型':
      return `診断結果の続きをお伝えします。

このタイプは「頭ではわかっているのに、体が合っていない」状態です。

・理解はしている
・でも体が遅れる
・考えが先、動きが後

改善

▶考える量を減らす
▶1つだけ意識する
▶動きながら修正する

頭の理解は十分です。
あとは体に落とすだけです。
${CTA}`;

    default:
      return `タイプがうまく取得できません。

「突進型」など一言送ってください。`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = body.events || [];

    for (const event of events) {
      if (event.type !== 'message') continue;
      if (event.message?.type !== 'text') continue;

      const text = event.message.text || '';
      const replyToken = event.replyToken;

      const type = detectType(text);
      const replyText = type ? buildReply(type) : `タイプがうまく取得できません。

「突進型」など一言送ってください。`;

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