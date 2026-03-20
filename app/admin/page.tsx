'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Stats = {
  totalUsers: number;
  laneA: number;
  laneB: number;
  laneC: number;
  selectionPriority: number;
  staffRequired: number;
  todayCount: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const { data: users, error: err } = await supabase
          .from('users')
          .select('*');

        if (err) throw err;
        if (!users) return;

        const today = new Date().toISOString().split('T')[0];
        setStats({
          totalUsers: users.length,
          laneA: users.filter(u => u.lane === 'A').length,
          laneB: users.filter(u => u.lane === 'B').length,
          laneC: users.filter(u => u.lane === 'C').length,
          selectionPriority: users.filter(u => u.selection_priority).length,
          staffRequired: users.filter(u => u.staff_required).length,
          todayCount: users.filter(u => u.created_at?.startsWith(today)).length,
        });
      } catch {
        setError('データの取得に失敗しました。Supabaseの設定を確認してください。');
      }
    }
    loadStats();
  }, []);

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h2 className="font-bold text-yellow-800 mb-2">接続エラー</h2>
        <p className="text-yellow-700 text-sm">{error}</p>
        <p className="text-yellow-600 text-xs mt-2">
          .env.local にSupabaseの環境変数を設定してください
        </p>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-gray-500 text-center py-12">読み込み中...</div>;
  }

  const statCards = [
    { label: '総ユーザー数', value: stats.totalUsers, color: 'bg-blue-500' },
    { label: '本日の診断数', value: stats.todayCount, color: 'bg-green-500' },
    { label: 'レーンA（教育）', value: stats.laneA, color: 'bg-gray-500' },
    { label: 'レーンB（オンライン）', value: stats.laneB, color: 'bg-yellow-500' },
    { label: 'レーンC（対面）', value: stats.laneC, color: 'bg-red-500' },
    { label: 'セレクション優先', value: stats.selectionPriority, color: 'bg-indigo-500' },
    { label: 'スタッフ対応要', value: stats.staffRequired, color: 'bg-orange-500' },
  ];

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">ダッシュボード</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-8 h-1 ${card.color} rounded mb-3`} />
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
