'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  prefecture: string | null;
  type_name: string;
  lane: string;
  tags: string[];
  total_score: number;
  line_delivery_step: number;
  conversion_status: string;
  staff_required: boolean;
  selection_priority: boolean;
  created_at: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not configured');
        const { data, error: err } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (err) throw err;
        setUsers(data || []);
      } catch {
        setError('データの取得に失敗しました');
      }
    }
    load();
  }, []);

  const filtered = filter === 'all'
    ? users
    : filter === 'staff'
    ? users.filter(u => u.staff_required)
    : filter === 'selection'
    ? users.filter(u => u.selection_priority)
    : users.filter(u => u.lane === filter);

  if (error) {
    return <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{error}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">ユーザー一覧</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">すべて</option>
          <option value="A">レーンA</option>
          <option value="B">レーンB</option>
          <option value="C">レーンC</option>
          <option value="staff">スタッフ対応要</option>
          <option value="selection">セレクション優先</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">日時</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">名前</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">メール</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">都道府県</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">タイプ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">レーン</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">スコア</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">タグ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">LINE</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">成約</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">対応</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {new Date(user.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {user.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                    {user.email || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {user.prefecture || '-'}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {user.type_name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        user.lane === 'C'
                          ? 'bg-red-100 text-red-700'
                          : user.lane === 'B'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {user.lane}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.total_score}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.tags?.map((tag: string, i: number) => (
                        <span key={i} className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.line_delivery_step}/5</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${
                      user.conversion_status === 'converted' ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {user.conversion_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.staff_required && (
                      <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded">要対応</span>
                    )}
                    {user.selection_priority && (
                      <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded ml-1">
                        セレクション
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-400">
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
