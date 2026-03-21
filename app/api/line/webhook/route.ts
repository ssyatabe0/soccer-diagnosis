import { NextRequest, NextResponse } from 'next/server';
import { getReplyByTypeName, ERROR_NO_ID, ERROR_NOT_FOUND } from '@/lib/line-result-templates';

const REPLY_URL = 'https://api.line.me/v2/bot/message/reply';

// テンプレキー一覧（部分一致検索用）
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

function findTypeInText(text: string): string | null {
  for (const key of TYPE_KEYS) {
    if (text.includes(key)) return key;
  }
  // 短縮キーワードでも部分一致
  const shortMap: Record<string, string> = {
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
  for (const [short, full] of Object.entries(shortMap)) {
    if (text.includes(short)) return full;
  }
  return null;
}

async function replyLine(token: string, replyToken: string, text: string) {
  const messages: { type: string; text: string }[] = [];
  if (text.length <= 5000) {
    messages.push({ type: 'text', text });
  } else {
    messages.push({ type: 'text', text: text.slice(0, 4900) + '\n\n（続きます）' });
    messages.push({ type: 'text', text: text.slice(4900, 9900) });
  }

  const res = await fetch(REPLY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ replyToken, messages }),
  });
  const body = await res.text();
  console.log('[reply] status:', res.status, 'body:', body);
  return res.ok;
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  console.log('=== WEBHOOK START ===');

  const raw = await request.text();
  console.log('[wh] raw:', raw.slice(0, 300));

  const events = JSON.parse(raw).events || [];
  console.log('[wh] events:', events.length);

  for (const ev of events) {
    if (ev.type !== 'message' || ev.message?.type !== 'text') continue;

    const text = ev.message.text || '';
    const replyToken = ev.replyToken;
    console.log('[wh] text:', text);

    // 1. ID抽出
    const idMatch = text.match(/(?:診断結果)?ID[:：]\s*([a-f0-9-]+)/i);
    const resultId = idMatch ? idMatch[1] : null;
    console.log('[wh] resultId:', resultId);

    // 2. DB検索（IDがある場合）
    let dbTypeName = '';
    if (resultId) {
      try {
        const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        if (url && key && !url.includes('placeholder')) {
          const dbRes = await fetch(`${url}/rest/v1/diagnosis_results?id=eq.${resultId}&select=type_name`, {
            headers: { apikey: key, Authorization: `Bearer ${key}` },
          });
          const dbData = await dbRes.json();
          console.log('[wh] db:', JSON.stringify(dbData));
          if (dbData?.[0]?.type_name) dbTypeName = dbData[0].type_name;
        }
      } catch (e) {
        console.log('[wh] db error:', e);
      }
    }
    console.log('[wh] dbTypeName:', dbTypeName || 'none');

    // 3. 本文からタイプ抽出（DB補完 or フォールバック）
    let typeName = dbTypeName;
    if (!typeName) {
      // "タイプ:" の後ろ
      const typeMatch = text.match(/タイプ[:：]\s*(.+?)(\n|$)/);
      if (typeMatch) typeName = typeMatch[1].trim();
    }
    if (!typeName) {
      // 本文中にタイプ名が含まれていないか部分一致
      typeName = findTypeInText(text) || '';
    }
    console.log('[wh] final typeName:', typeName || 'none');

    // 4. 返信
    if (!typeName && !resultId) {
      // IDもタイプも取れない
      console.log('[wh] → no ID, no type');
      await replyLine(TOKEN, replyToken, ERROR_NO_ID);
      continue;
    }

    if (!typeName) {
      // IDはあるがタイプが分からない
      console.log('[wh] → ID found but no type');
      await replyLine(TOKEN, replyToken, ERROR_NOT_FOUND);
      continue;
    }

    // テンプレ返信
    const replyBody = getReplyByTypeName(typeName);
    console.log('[wh] template matched, length:', replyBody.length);
    await replyLine(TOKEN, replyToken, replyBody);

    // users更新
    if (resultId) {
      try {
        const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const userId = ev.source?.userId;
        if (url && key && userId && !url.includes('placeholder')) {
          await fetch(`${url}/rest/v1/users?id=eq.${resultId}`, {
            method: 'PATCH',
            headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify({ line_user_id: userId, line_delivery_step: 1 }),
          });
        }
      } catch { /* ignore */ }
    }
  }

  console.log('=== WEBHOOK END ===');
  return NextResponse.json({ status: 'ok' });
}
