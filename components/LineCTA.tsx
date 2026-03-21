'use client';

import { useState } from 'react';
import { DiagnosisResult } from '@/lib/types';

const LINE_URL = 'https://lin.ee/RfP779J';

export default function LineCTA({ result }: { result: DiagnosisResult }) {
  const [copied, setCopied] = useState(false);

  const copyText = `診断結果の続きをお願いします\nID: ${result.id}\nタイプ: ${result.type.name}`;

  function handleCopy() {
    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const el = document.getElementById('copy-area') as HTMLTextAreaElement;
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
        LINEで結果をコピーして送信すると<br />続きの結果が届きます
      </p>

      {/* LINEを開く */}
      <a
        href={LINE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-white text-[#06C755] font-bold py-4 px-6 rounded-full shadow-md transition-all active:scale-95 hover:bg-green-50 mb-3"
      >
        LINEを開く
      </a>

      {/* 結果をコピー */}
      <button
        onClick={handleCopy}
        className="block w-full bg-white/20 text-white font-bold py-3 px-6 rounded-full transition-all active:scale-95 hover:bg-white/30 mb-4"
      >
        {copied ? 'コピーしました！' : '結果をコピーする'}
      </button>

      {/* コピー内容の常時表示 */}
      <div className="bg-black/20 rounded-xl p-3 text-left">
        <p className="text-white/50 text-xs mb-1">送信するメッセージ</p>
        <textarea
          id="copy-area"
          readOnly
          value={copyText}
          className="w-full bg-white/10 text-white text-xs rounded-lg p-3 border border-white/20 resize-none focus:outline-none"
          rows={3}
        />
      </div>
    </div>
  );
}
