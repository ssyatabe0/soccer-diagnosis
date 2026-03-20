'use client';

import { DiagnosisResult } from '@/lib/types';

const LINE_FRIEND_URL = 'https://lin.ee/q7xbzrk';

export default function LineCTA({ result }: { result: DiagnosisResult }) {
  const text = `診断結果をお願いします\nID: ${result.id}\nタイプ: ${result.type.name}`;
  const lineTextUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;

  return (
    <div className="bg-gradient-to-br from-[#06C755] to-[#05a347] rounded-2xl p-6 mb-4 text-white text-center shadow-lg">
      <p className="text-white/80 text-xs mb-2">ここまでが無料で見られる結果です</p>
      <h3 className="text-lg font-extrabold mb-2">
        詳しい伸ばし方を<br />LINEで受け取る
      </h3>
      <p className="text-white/80 text-xs mb-4 leading-relaxed">
        お子さんのタイプに合う伸ばし方を<br />LINEでご案内します
      </p>

      {/* 友だち追加済み → 本文自動入力で開く */}
      <a
        href={lineTextUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-white text-[#06C755] font-bold py-4 px-6 rounded-full shadow-md transition-all active:scale-95 hover:bg-green-50 mb-3"
      >
        追加済みの方はこちら
      </a>

      {/* 未追加 → 友だち追加 */}
      <a
        href={LINE_FRIEND_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-white/20 text-white font-bold py-3 px-6 rounded-full transition-all active:scale-95 hover:bg-white/30"
      >
        友だち追加する
      </a>

      <p className="text-white/60 text-xs mt-3">
        友だち追加後にメッセージを送ると届きます
      </p>
    </div>
  );
}
