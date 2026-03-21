import { NextRequest, NextResponse } from 'next/server';
import { getReplyByTypeName } from '@/lib/line-result-templates';

const TYPE_KEYS = [
  '技術あるのに出せない温存型',
  '最初の一歩が遅れる受け身型',
  'ボール受ける前で負ける後手型',
  '周りに合わせすぎる遠慮型',
  '先に急ぎすぎる突進型',
  'ミスを恐れて選択が減る慎重型',
  '試合で消えやすい慎重派',
  '練習と試合で別人になる分離型',
  '1対1で力を隠す安全運転型',
  '見えてるのに出せない準備不足型',
  'ボール触れば良いのに触れない待機型',
  '頭ではわかってるのに体が合わない思考先行型',
];

const SHORT_MAP: Record<string, string> = {
  '温存型': '技術あるのに出せない温存型',
  '受け身型': '最初の一歩が遅れる受け身型',
  '後手型': 'ボール受ける前で負ける後手型',
  '遠慮型': '周りに合わせすぎる遠慮型',
  '突進型': '先に急ぎすぎる突進型',
  '慎重型': 'ミスを恐れて選択が減る慎重型',
  '慎重派': '試合で消えやすい慎重派',
  '分離型': '練習と試合で別人になる分離型',
  '安全運転型': '1対1で力を隠す安全運転型',
  '準備不足型': '見えてるのに出せない準備不足型',
  '待機型': 'ボール触れば良いのに触れない待機型',
  '思考先行型': '頭ではわかってるのに体が合わない思考先行型',
};

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  console.log('=== WEBHOOK ===');

  const raw = await request.text();
  const events = JSON.parse(raw).events || [];

  for (const ev of events) {
    if (ev.type !== 'message' || ev.message?.type !== 'text') continue;

    const text: string = ev.message.text || '';
    const replyToken: string = ev.replyToken;
    console.log('[wh] text:', text);

    // === replyText を1つだけ決める ===
    let replyText = '';
    let typeName = '';

    // ① ID抽出 → DB検索
    const idMatch = text.match(/(?:診断結果)?ID[:：]\s*([a-f0-9-]+)/i);
    if (idMatch) {
      const resultId = idMatch[1];
      console.log('[wh] resultId:', resultId);
      try {
        const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        if (url && key && !url.includes('placeholder')) {
          const r = await fetch(`${url}/rest/v1/diagnosis_results?id=eq.${resultId}&select=type_name`, {
            headers: { apikey: key, Authorization: `Bearer ${key}` },
          });
          const d = await r.json();
          console.log('[wh] db:', JSON.stringify(d));
          if (d?.[0]?.type_name) typeName = d[0].type_name;
        }
      } catch (e) {
        console.log('[wh] db err:', e);
      }
    }

    // ② DB取得できなければ本文の「タイプ:」行
    if (!typeName) {
      const m = text.match(/タイプ[:：]\s*(.+?)(\n|$)/);
      if (m) typeName = m[1].trim();
    }

    // ③ それでもなければ部分一致
    if (!typeName) {
      for (const k of TYPE_KEYS) { if (text.includes(k)) { typeName = k; break; } }
    }
    if (!typeName) {
      for (const [s, f] of Object.entries(SHORT_MAP)) { if (text.includes(s)) { typeName = f; break; } }
    }

    // replyText 確定
    if (typeName) {
      replyText = getReplyByTypeName(typeName);
      console.log('[wh] matched:', typeName);
    } else {
      replyText = '診断結果を確認しました。\n\n続きの結果を受け取るには、サイトの「結果をコピーする」で取得したテキストをそのまま送ってください。';
      console.log('[wh] fallback');
    }

    // === 1回だけ返信 ===
    console.log('[wh] replyText:', replyText.slice(0, 80));
    console.log('[wh] replyToken:', replyToken);

    const messages: { type: string; text: string }[] = [];
    if (replyText.length <= 5000) {
      messages.push({ type: 'text', text: replyText });
    } else {
      messages.push({ type: 'text', text: replyText.slice(0, 4900) + '\n\n（続きます）' });
      messages.push({ type: 'text', text: replyText.slice(4900, 9900) });
    }

    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ replyToken, messages }),
    });

    const resBody = await res.text();
    console.log('[wh] reply status:', res.status);
    console.log('[wh] reply body:', resBody);
  }

  console.log('=== DONE ===');
  return NextResponse.json({ status: 'ok' });
}
