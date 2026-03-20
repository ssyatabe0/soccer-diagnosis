'use client';

import { useState, useEffect } from 'react';
import { DiagnosisResult } from '@/lib/types';

const LINE_OA_ID = process.env.NEXT_PUBLIC_LINE_OA_ID || '';
const FALLBACK_LINE_URL = 'https://lin.ee/qzc2ot7';

export default function LineCTA({ result }: { result: DiagnosisResult }) {
  const [sent, setSent] = useState(false);
  const [dbOk, setDbOk] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const status = localStorage.getItem(`diagnosis-db-${result.id}`);
      setDbOk(status === 'ok');
      console.log('[LineCTA] resultId:', result.id, 'dbStatus:', status);
    } catch {
      setDbOk(false);
    }
  }, [result.id]);

  function handleClick() {
    const text = `診断結果を見ました\nresultId=${result.id}\ntype=${result.type.name}\nlane=${result.lane}\ntags=${result.tags.join(',')}`;
    console.log('[LineCTA] sending text:', text);

    const encoded = encodeURIComponent(text);

    let url: string;
    if (LINE_OA_ID && LINE_OA_ID !== 'placeholder') {
      url = `https://line.me/R/oaMessage/${LINE_OA_ID}/?${encoded}`;
    } else {
      // OA_ID未設定 → フォールバック（友だち追加リンク）
      url = FALLBACK_LINE_URL;
    }

    console.log('[LineCTA] opening URL:', url);
    window.open(url, '_blank');
    setSent(true);
  }

  // DB保存失敗時: typeNameがメッセージに含まれるのでwebhookでテンプレ返信は可能
  // ただし警告を出す
  if (dbOk === false) {
    console.log('[LineCTA] DB save was failed, LINE reply will use typeName from message text');
  }

  if (sent) {
    return (
      <div className="bg-gradient-to-br from-[#06C755] to-[#05a347] rounded-2xl p-6 mb-4 text-white text-center shadow-lg">
        <div className="text-4xl mb-3">&#10003;</div>
        <h3 className="text-lg font-extrabold mb-2">
          LINEが開きました
        </h3>
        <p className="text-white/80 text-sm leading-relaxed mb-4">
          LINEでそのまま送信すると<br />続きの結果が届きます
        </p>
        <button
          onClick={handleClick}
          className="text-white/70 text-xs underline"
        >
          もう一度LINEを開く
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#06C755] to-[#05a347] rounded-2xl p-6 mb-4 text-white text-center shadow-lg">
      <p className="text-white/80 text-xs mb-2">ここまでが無料で見られる結果です</p>
      <h3 className="text-lg font-extrabold mb-2">
        詳しい伸ばし方を<br />LINEで受け取る
      </h3>
      <p className="text-white/80 text-xs mb-4 leading-relaxed">
        お子さんのタイプに合う伸ばし方を<br />LINEでご案内します
      </p>
      <button
        onClick={handleClick}
        className="inline-block w-full bg-white text-[#06C755] font-bold py-4 px-6 rounded-full shadow-md transition-all active:scale-95 hover:bg-green-50"
      >
        この結果をLINEで送る
      </button>
      <p className="text-white/60 text-xs mt-3">
        LINEが開いたらそのまま送信してください
      </p>
    </div>
  );
}
