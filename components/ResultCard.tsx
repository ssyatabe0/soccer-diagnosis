'use client';

import { useState } from 'react';
import { DiagnosisResult } from '@/lib/types';
import { DEPARTMENT_LINKS } from '@/lib/constants';
import { getLaneDescription } from '@/lib/diagnosis-logic';
import ShareButtons from './ShareButtons';
import ContactModal from './ContactModal';

export default function ResultCard({ result }: { result: DiagnosisResult }) {
  const laneInfo = getLaneDescription(result.lane);
  const type = result.type;
  const [showContact, setShowContact] = useState(false);

  return (
    <div className="w-full max-w-lg mx-auto px-4 pb-16">
      {/* Type Header Card */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-500 rounded-2xl p-6 text-white shadow-xl mb-6">
        <p className="text-green-200 text-xs font-medium mb-1">あなたのお子さんのタイプ</p>
        <h1 className="text-2xl font-extrabold mb-2">{type.name}</h1>
        <p className="text-green-100 text-sm leading-relaxed">{type.oneWord}</p>

        {/* Sub Labels */}
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

      {/* Sub Label Messages */}
      {result.subLabels.length > 0 && (
        <div className="space-y-3 mb-6">
          {result.subLabels.map((label, i) => (
            <div key={i} className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-700 text-xs font-bold mb-1">{label.label}</p>
              <p className="text-green-800 text-sm leading-relaxed">{label.message}</p>
            </div>
          ))}
        </div>
      )}

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

      {/* Cause Redefinition */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <h2 className="font-bold text-gray-900 text-sm mb-3">原因の再定義</h2>
        <p className="text-sm text-gray-700 leading-relaxed">{type.causeRedefinition}</p>
      </div>

      {/* Growth Points */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <h2 className="font-bold text-gray-900 text-sm mb-3">伸びるポイント</h2>
        <ul className="space-y-2">
          {type.growthPoints.map((point, i) => (
            <li key={i} className="flex items-start text-sm text-gray-700">
              <span className="text-green-500 mr-2 font-bold">{i + 1}.</span>
              {point}
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

      {/* CTA Section */}
      <div className="space-y-3 mb-8">
        <h2 className="font-bold text-gray-900 text-base text-center mb-4">
          次のステップ
        </h2>

        {/* Primary CTA based on lane */}
        <a
          href={laneInfo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-green-600 hover:bg-green-700 text-white text-center font-bold py-4 px-6 rounded-full shadow-lg shadow-green-200 transition-all active:scale-95"
        >
          {laneInfo.cta}
        </a>

        {/* LINE CTA → 問い合わせ / 最新情報 */}
        <a
          href="https://lin.ee/qzc2ot7"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-[#06C755] hover:bg-[#05b34d] text-white text-center font-bold py-4 px-6 rounded-full shadow-lg transition-all active:scale-95"
        >
          最新情報を無料で受け取る／問い合わせる
        </a>

        {/* メールで問い合わせ */}
        <button
          onClick={() => setShowContact(true)}
          className="block w-full bg-white border-2 border-green-500 text-green-700 text-center font-bold py-3 px-6 rounded-full transition-all hover:bg-green-50 active:scale-95"
        >
          メールで問い合わせる
        </button>

        {/* Secondary CTAs */}
        {result.lane !== 'B' && (
          <a
            href="https://soccer-kateikyousi.com/%e3%82%aa%e3%83%b3%e3%83%a9%e3%82%a4%e3%83%b3%e8%a8%ba%e6%96%ad/"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-white border-2 border-gray-300 text-gray-700 text-center font-bold py-3 px-6 rounded-full transition-all hover:bg-gray-50"
          >
            オンライン診断を詳しく見る
          </a>
        )}
        {result.lane !== 'C' && (
          <a
            href="https://soccer-kateikyousi.com/%E5%88%9D%E3%82%81%E3%81%A6%E3%81%94%E6%9D%A5%E9%99%A2%E3%81%AE%E6%96%B9%E3%81%B8/"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-white border-2 border-gray-300 text-gray-700 text-center font-bold py-3 px-6 rounded-full transition-all hover:bg-gray-50"
          >
            スタート診断（対面）を詳しく見る
          </a>
        )}
      </div>

      {/* Share Section */}
      <ShareButtons result={result} />

      {/* Contact Modal */}
      {showContact && (
        <ContactModal result={result} onClose={() => setShowContact(false)} />
      )}
    </div>
  );
}
