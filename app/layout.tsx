import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = { title: 'はまもと整形外科クリニック | オンライン受付', description: 'オンライン診療受付システム' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="ja"><body>{children}</body></html>)
}