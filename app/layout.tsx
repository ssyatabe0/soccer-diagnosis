import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'サッカー才能の出し方診断 | サッカー家庭教師',
  description:
    '30秒の無料診断で、お子さんのサッカーの才能の"出し方"がわかる。技術不足ではなく、出し方を変えるだけで伸びる。',
  openGraph: {
    title: 'サッカー才能の出し方診断',
    description: '30秒でわかる！お子さんのサッカーの才能、ちゃんと出せていますか？',
    type: 'website',
    images: ['/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gradient-to-b from-green-50 to-white">
        {children}
      </body>
    </html>
  );
}
