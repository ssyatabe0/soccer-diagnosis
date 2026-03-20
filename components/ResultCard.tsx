'use client';

import { DiagnosisResult } from '@/lib/types';
import { DEPARTMENT_LINKS } from '@/lib/constants';
import ShareButtons from './ShareButtons';
import LineCTA from './LineCTA';

export default function ResultCard({ result }: { result: DiagnosisResult }) {
  const type = result.type;

  return (
    <div className="w-full max-w-lg mx-auto px-4 pb-16">
      {/* Hidden result ID */}
      <input type="hidden" id="diagnosis-result-id" value={result.id} />

      {/* ===== 無料公開セクション ===== */}

      {/* Type Header Card */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-500 rounded-2xl p-6 text-white shadow-xl mb-6">
        <p className="text-green-200 text-xs font-medium mb-1">あなたのお子さんのタイプ</p>
        <h1 className="text-2xl font-extrabold mb-2">{type.name}</h1>
        <p className="text-green-100 text-sm leading-relaxed">{type.oneWord}</p>

        {result.subLabels.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {result.subLabels.map((label, i) => (
              <span key={i} className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">
                {label.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Aruaru Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <h2 className="font-bold text-gray-900 text-sm mb-3">あるある</h2>
        <ul className="space-y-2">
          {type.aruaru.map((item, i) => (
            <li key={i} className="flex items-start text-sm text-gray-700">
              <span className="text-yellow-500 mr-2 mt-0.5">●</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Priority Theme */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mb-4">
        <h2 className="font-bold text-gray-900 text-sm mb-2">今のフェーズの優先テーマ</h2>
        <p className="text-lg font-bold text-yellow-700">{type.priorityTheme}</p>
      </div>

      {/* Related Departments */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <h2 className="font-bold text-gray-900 text-sm mb-3">関連診療科</h2>
        <div className="flex flex-wrap gap-2">
          {type.departments.map((dept, i) => (
            <a
              key={i}
              href={DEPARTMENT_LINKS[dept] || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-100 text-green-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-green-200 transition-colors"
            >
              {dept}
            </a>
          ))}
        </div>
      </div>

      {/* ===== ロックコンテンツプレビュー ===== */}
      <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white z-10 pointer-events-none" />
        <h2 className="font-bold text-gray-900 text-sm mb-3">原因の再定義</h2>
        <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">
          {type.causeRedefinition.slice(0, 30)}...
        </p>
        <h2 className="font-bold text-gray-900 text-sm mt-4 mb-3">伸びるポイント</h2>
        <ul className="space-y-2">
          {type.growthPoints.map((_, i) => (
            <li key={i} className="flex items-start text-sm text-gray-300">
              <span className="mr-2 font-bold">{i + 1}.</span>
              ●●●●●●●●●●●●●●●●
            </li>
          ))}
        </ul>
      </div>

      {/* ===== LINE CTA（LIFF連携） ===== */}
      <LineCTA result={result} />

      {/* Sub Label Messages */}
      {result.subLabels.length > 0 && (
        <div className="space-y-3 mb-4">
          {result.subLabels.map((label, i) => (
            <div key={i} className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-700 text-xs font-bold mb-1">{label.label}</p>
              <p className="text-green-800 text-sm leading-relaxed">{label.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Case Links */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <h2 className="font-bold text-gray-900 text-sm mb-3">症例カルテ</h2>
        {type.caseLinks.map((link, i) => (
          <a
            key={i}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 text-sm hover:underline block"
          >
            同じタイプの改善事例を見る →
          </a>
        ))}
      </div>

      {/* Secondary CTA */}
      <div className="space-y-3 mb-8">
        <h2 className="font-bold text-gray-900 text-base text-center mb-4">
          次のステップ
        </h2>
        <a
          href="https://soccer-kateikyousi.com/%e3%82%aa%e3%83%b3%e3%83%a9%e3%82%a4%e3%83%b3%e8%a8%ba%e6%96%ad/"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-white border-2 border-gray-300 text-gray-700 text-center font-bold py-3 px-6 rounded-full transition-all hover:bg-gray-50"
        >
          オンライン診断を詳しく見る
        </a>
        <a
          href="https://soccer-kateikyousi.com/%E5%88%9D%E3%82%81%E3%81%A6%E3%81%94%E6%9D%A5%E9%99%A2%E3%81%AE%E6%96%B9%E3%81%B8/"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-white border-2 border-gray-300 text-gray-700 text-center font-bold py-3 px-6 rounded-full transition-all hover:bg-gray-50"
        >
          スタート診断（対面）を詳しく見る
        </a>
      </div>

      {/* Share */}
      <ShareButtons result={result} />
    </div>
  );
}
