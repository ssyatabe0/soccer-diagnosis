'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const navItems = [
  { href: '/admin/ai-secretary/dashboard', label: 'Morning' },
  { href: '/admin/ai-secretary/today', label: 'Today' },
  { href: '/admin/ai-secretary/customers', label: 'Customers' },
  { href: '/admin/ai-secretary/inbox', label: 'Inbox' },
  { href: '/admin/ai-secretary/tasks', label: 'Tasks' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-sm">Yatabe Daily OS</h1>
          <Link href="/" className="text-gray-400 text-xs hover:text-white">
            サイトを見る →
          </Link>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-200">
        <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-3 text-sm text-gray-500">Loading navigation...</div>}>
          <AdminNavigation />
        </Suspense>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

function AdminNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const tokenSuffix = token ? `?token=${encodeURIComponent(token)}` : '';

  return (
    <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={`${item.href}${tokenSuffix}`}
          className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            pathname === item.href || (pathname === '/admin/ai-secretary/morning' && item.href === '/admin/ai-secretary/dashboard')
              ? 'border-green-500 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
