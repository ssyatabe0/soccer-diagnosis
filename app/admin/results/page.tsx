'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DIAGNOSIS_TYPES } from '@/lib/constants';

type ResultRow = {
  id: string;
  type_id: number;
  type_name: string;
  lane: string;
  tags: string[];
  total_score: number;
  created_at: string;
};

export default function AdminResultsPage() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [typeFilter, setTypeFilter] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data, error: err } = await supabase
          .from('diagnosis_results')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (err) throw err;
        setResults(data || []);
      } catch {
        setError('データの取得に失敗しました');
      }
    }
    load();
  }, []);

  const filtered = typeFilter === 0
    ? results
    : results.filter(r => r.type_id === typeFilter);

  // Type distribution
  const typeDistribution = DIAGNOSIS_TYPES.map(type => ({
    ...type,
    count: results.filter(r => r.type_id === type.id).length,
  })).sort((a, b) => b.count - a.count);

  if (error) {
    return <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{error}</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">診断結果</h2>

      {/* Type Distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h3 className="font-bold text-gray-700 text-sm mb-3">タイプ分布</h3>
        <div className="space-y-2">
          {typeDistribution.map((type) => (
            <div key={type.id} className="flex items-center gap-3">
              <button
                onClick={() => setTypeFilter(typeFilter === type.id ? 0 : type.id)}
                className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                  typeFilter === type.id
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type.count}
              </button>
              <span className="text-sm text-gray-700 truncate">{type.name}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${results.length > 0 ? (type.count / results.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">日時</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">タイプ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">レーン</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">スコア</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">タグ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">結果</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(r.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.type_name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        r.lane === 'C'
                          ? 'bg-red-100 text-red-700'
                          : r.lane === 'B'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {r.lane}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.total_score}点</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.tags?.map((tag: string, i: number) => (
                        <span key={i} className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/diagnosis/result/${r.id}`}
                      target="_blank"
                      className="text-green-600 text-xs hover:underline"
                    >
                      結果を見る
                    </a>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
