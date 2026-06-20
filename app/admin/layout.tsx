'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin/ai-secretary/os-map', label: 'OSマップ' },
  { href: '/admin/ai-secretary/dashboard', label: 'ダッシュボード' },
  { href: '/admin/ai-secretary/line-inbox', label: '未対応LINE' },
  { href: '/admin/ai-secretary/customers', label: '顧客' },
  { href: '/admin/ai-secretary/revenue', label: '売上' },
  { href: '/admin/ai-secretary/contracts', label: '契約' },
  { href: '/admin/ai-secretary/tickets', label: '回数券' },
  { href: '/admin/ai-secretary/follow', label: 'フォロー' },
  { href: '/admin/ai-secretary/cases', label: '症例' },
  { href: '/admin/ai-secretary/videos', label: '動画' },
  { href: '/admin/ai-secretary/diagnosis-center', label: 'AI診断' },
  { href: '/admin/ai-secretary/proposals', label: 'AI提案書' },
  { href: '/admin/ai-secretary/integrations', label: '設定' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-sm">谷田部OS 管理画面</h1>
          <Link href="/" className="text-gray-400 text-xs hover:text-white">
            サイトを見る →
          </Link>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                pathname === item.href
                  ? 'border-green-500 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
