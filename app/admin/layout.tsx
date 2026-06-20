'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin', label: 'ダッシュボード' },
  { href: '/admin/users', label: 'ユーザー一覧' },
  { href: '/admin/results', label: '診断結果' },
  { href: '/admin/ai-secretary/dashboard', label: 'AI秘書 今日の対応' },
  { href: '/admin/ai-secretary/sales-meeting', label: 'AI秘書 営業会議' },
  { href: '/admin/ai-secretary/today-sales', label: 'AI秘書 今日の営業' },
  { href: '/admin/ai-secretary/line-inbox', label: 'AI秘書 LINE未対応' },
  { href: '/admin/ai-secretary/integrations', label: 'AI秘書 Gmail/カレンダー' },
  { href: '/admin/ai-secretary/customers', label: 'AI秘書 顧客マスタ' },
  { href: '/admin/ai-secretary/revenue', label: 'AI秘書 売上候補' },
  { href: '/admin/ai-secretary/reviews', label: 'AI秘書 レビュー' },
  { href: '/admin/ai-secretary/churn-risk', label: 'AI秘書 退会防止' },
  { href: '/admin/ai-secretary/contracts', label: 'AI秘書 契約書' },
  { href: '/admin/ai-secretary/search', label: 'AI秘書 自然文検索' },
  { href: '/admin/ai-secretary/cases', label: 'AI秘書 症例DB' },
  { href: '/admin/ai-secretary/videos', label: 'AI秘書 動画DB' },
  { href: '/admin/ai-secretary/case-search', label: 'AI秘書 症例検索' },
  { href: '/admin/ai-secretary/article-generator', label: 'AI秘書 記事生成' },
  { href: '/admin/ai-secretary/sns-generator', label: 'AI秘書 SNS生成' },
  { href: '/admin/ai-secretary/diagnosis-center', label: 'AI診断センター' },
  { href: '/admin/ai-secretary/proposals', label: 'AI提案書' },
  { href: '/admin/ai-secretary/coach-support', label: 'AIコーチ支援' },
  { href: '/admin/ai-secretary/case-library', label: '症例ライブラリ' },
  { href: '/admin/ai-secretary/parent-consultation', label: '保護者相談' },
  { href: '/admin/ai-secretary/staff-training', label: 'スタッフ教育' },
  { href: '/admin/ai-secretary/quality-control', label: '品質管理' },
  { href: '/admin/ai-secretary/saas-os', label: 'メソッドOS' },
  { href: '/admin/ai-secretary/tenant-dashboard', label: 'SaaS管理' },
  { href: '/admin/ai-secretary/saas-pricing', label: 'SaaS料金' },
  { href: '/admin/ai-secretary/saas-api', label: 'SaaS API' },
  { href: '/admin/ai-secretary/saas-plan', label: '事業計画' },
  { href: '/admin/ai-secretary/method-network', label: '認定ネットワーク' },
  { href: '/admin/ai-secretary/coach-certification', label: '認定コーチ' },
  { href: '/admin/ai-secretary/school-certification', label: '認定スクール' },
  { href: '/admin/ai-secretary/national-cases', label: '全国症例DB' },
  { href: '/admin/ai-secretary/referral-network', label: '紹介ネットワーク' },
  { href: '/admin/ai-secretary/global-expansion', label: '世界展開' },
  { href: '/admin/ai-secretary/global-diagnosis', label: '海外診断' },
  { href: '/admin/ai-secretary/world-cases', label: '世界症例DB' },
  { href: '/admin/ai-secretary/overseas-camps', label: '海外キャンプ' },
  { href: '/admin/ai-secretary/ai-translation', label: 'AI通訳' },
  { href: '/admin/ai-secretary/soccer-hospital', label: 'サッカー病院' },
  { href: '/admin/ai-secretary/medical-records', label: '電子カルテ' },
  { href: '/admin/ai-secretary/prescriptions', label: 'AI処方箋' },
  { href: '/admin/ai-secretary/improvement-prediction', label: '改善予測' },
  { href: '/admin/ai-secretary/case-lab', label: '症例研究所' },
  { href: '/admin/ai-secretary/soccer-university', label: 'サッカー大学' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-sm">サッカー才能診断 管理画面</h1>
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
