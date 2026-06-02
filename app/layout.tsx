import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'はまもと整形外科クリニック｜ご予約',
  description: 'オンライン予約システム',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
