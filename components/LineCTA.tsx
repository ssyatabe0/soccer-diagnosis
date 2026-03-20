'use client';

import { useState } from 'react';
import { DiagnosisResult } from '@/lib/types';

const LINE_FRIEND_URL = 'https://lin.ee/q7xbzrk';

export default function LineCTA({ result }: { result: DiagnosisResult }) {
  const [copied, setCopied] = useState(false);

  const copyText = `診断結果の続きをお願いします\n\n診断結果ID: ${result.id}\nタイプ: ${result.type.name}`;

  function handleOpenLine() {
    const text = `診断結果をお願いします\nID: ${result.id}\nタイプ: ${result.type.name}`;
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    window.location.href = url;
  }

  function handleCopy() {
    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // フォールバック
      const el = document.getElementById('copy-text-area') as HTMLTextAreaElement;
      if (el) { el.select(); document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    });
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

      {/* LINEを開く */}
      <button
        onClick={handleOpenLine}
        className="block w-full bg-white text-[#06C755] font-bold py-4 px-6 rounded-full shadow-md transition-all active:scale-95 hover:bg-green-50 mb-3"
      >
        LINEで結果を受け取る
      </button>

      {/* 友だち追加 */}
      <a
        href={LINE_FRIEND_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-white/20 text-white font-bold py-3 px-6 rounded-full transition-all active:scale-95 hover:bg-white/30 mb-4"
      >
        友だち追加がまだの方はこちら
      </a>

      {/* コピー用テキスト */}
      <div className="bg-black/20 rounded-xl p-4 text-left mb-3">
        <p className="text-white/60 text-xs mb-2">以下をコピーしてLINEで送信してください</p>
        <textarea
          id="copy-text-area"
          readOnly
          value={copyText}
          className="w-full bg-white/10 text-white text-xs rounded-lg p-3 border border-white/20 resize-none focus:outline-none"
          rows={4}
        />
      </div>

      <button
        onClick={handleCopy}
        className="block w-full bg-white/20 text-white font-bold py-3 px-6 rounded-full transition-all active:scale-95 hover:bg-white/30"
      >
        {copied ? 'コピーしました！' : '診断結果をコピーする'}
      </button>
    </div>
  );
}
