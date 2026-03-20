'use client';

import { useEffect, useState } from 'react';
import { DIAGNOSIS_TYPES, SUB_LABELS } from '@/lib/constants';
import { DiagnosisResult, Lane, TargetTag } from '@/lib/types';
import ResultCard from './ResultCard';

export default function ResultFallback({ id }: { id: string }) {
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`diagnosis-result-${id}`);
      if (raw) {
        const saved = JSON.parse(raw);
        const type = DIAGNOSIS_TYPES.find(t => t.id === saved.typeId) || DIAGNOSIS_TYPES[0];
        const tags: TargetTag[] = saved.tags || [];
        setResult({
          id: saved.id,
          type,
          lane: saved.lane as Lane,
          tags,
          subLabels: tags.map(t => SUB_LABELS[t]),
          totalScore: saved.totalScore,
          answers: saved.answers,
          createdAt: saved.createdAt,
        });
      }
    } catch (e) {
      console.error('localStorage fallback error:', e);
    }
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-500 text-sm">結果を読み込み中...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-16 px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">診断結果が見つかりません</h2>
        <p className="text-gray-500 text-sm mb-8">
          もう一度診断をお試しください。
        </p>
        <a
          href="/diagnosis"
          className="bg-green-600 text-white font-bold py-3 px-8 rounded-full hover:bg-green-700 transition-all"
        >
          もう一度診断する
        </a>
      </div>
    );
  }

  return <ResultCard result={result} />;
}
