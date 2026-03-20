import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { DIAGNOSIS_TYPES, QUESTIONS } from '@/lib/constants';

const resend = new Resend(process.env.RESEND_API_KEY);
const MAIL_TO = process.env.MAIL_TO || 'ssyatabe0@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resultId, typeId, typeName, lane, tags, totalScore, answers, createdAt } = body;

    const type = DIAGNOSIS_TYPES.find(t => t.id === typeId) || DIAGNOSIS_TYPES[0];

    // 回答内容を読みやすく整形
    const answersHtml = (answers || [])
      .map((ansIdx: number, qIdx: number) => {
        const q = QUESTIONS[qIdx];
        const optText = q?.options[ansIdx]?.text || `選択肢${ansIdx}`;
        return `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee;color:#666;">Q${qIdx + 1}. ${q?.text || ''}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;font-weight:600;">${optText}</td></tr>`;
      })
      .join('');

    const tagsHtml = (tags || [])
      .map((t: string) => `<span style="display:inline-block;background:#dcfce7;color:#166534;padding:2px 10px;border-radius:12px;font-size:12px;margin:2px;">${t}</span>`)
      .join(' ');

    const laneLabel = lane === 'A' ? 'A（教育・無料フォロー）' : lane === 'B' ? 'B（オンライン診断）' : 'C（対面・優先対応）';
    const laneColor = lane === 'C' ? '#dc2626' : lane === 'B' ? '#ca8a04' : '#6b7280';

    const html = `
<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
  <div style="background:linear-gradient(135deg,#16a34a,#10b981);padding:20px;border-radius:12px;color:white;margin-bottom:20px;">
    <h1 style="margin:0;font-size:18px;">新しい診断結果</h1>
    <p style="margin:4px 0 0;font-size:13px;opacity:0.8;">サッカー才能の出し方診断</p>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <tr>
      <td style="padding:8px;background:#f9fafb;font-size:12px;color:#666;width:120px;">診断ID</td>
      <td style="padding:8px;font-size:13px;font-family:monospace;">${resultId}</td>
    </tr>
    <tr>
      <td style="padding:8px;background:#f9fafb;font-size:12px;color:#666;">タイプ</td>
      <td style="padding:8px;font-size:14px;font-weight:700;">${typeName}</td>
    </tr>
    <tr>
      <td style="padding:8px;background:#f9fafb;font-size:12px;color:#666;">レーン</td>
      <td style="padding:8px;"><span style="background:${laneColor};color:white;padding:2px 10px;border-radius:4px;font-size:12px;font-weight:700;">${laneLabel}</span></td>
    </tr>
    <tr>
      <td style="padding:8px;background:#f9fafb;font-size:12px;color:#666;">スコア</td>
      <td style="padding:8px;font-size:16px;font-weight:700;">${totalScore}点</td>
    </tr>
    <tr>
      <td style="padding:8px;background:#f9fafb;font-size:12px;color:#666;">タグ</td>
      <td style="padding:8px;">${tagsHtml || 'なし'}</td>
    </tr>
    <tr>
      <td style="padding:8px;background:#f9fafb;font-size:12px;color:#666;">日時</td>
      <td style="padding:8px;font-size:13px;">${createdAt ? new Date(createdAt).toLocaleString('ja-JP') : '-'}</td>
    </tr>
  </table>

  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
    <h3 style="margin:0 0 8px;font-size:13px;color:#166534;">コメント</h3>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#333;">${type.causeRedefinition}</p>
  </div>

  <div style="margin-bottom:20px;">
    <h3 style="font-size:13px;color:#666;margin-bottom:8px;">回答内容</h3>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      ${answersHtml}
    </table>
  </div>

  <div style="border-top:1px solid #eee;padding-top:12px;font-size:11px;color:#999;">
    サッカー才能の出し方診断 管理通知
  </div>
</body></html>`;

    const { data, error } = await resend.emails.send({
      from: 'サッカー才能診断 <onboarding@resend.dev>',
      to: [MAIL_TO],
      subject: `【サッカー診断】新しい診断結果 - ${typeName}`,
      html,
    });

    if (error) {
      console.log('notify-result email error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('notify-result email sent:', data?.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.log('notify-result error:', err);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
