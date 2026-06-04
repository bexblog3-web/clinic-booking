'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const DEPT_LABEL: Record<string, string> = { ent: '耳鼻科', orthopedics: '整形外科' }

export default function CompletePage() {
  const router = useRouter()
  const [booking, setBooking] = useState<any>(null)
  const [queue, setQueue] = useState<any>(null)

  useEffect(() => {
    const b = sessionStorage.getItem('lastBooking')
    if (!b) { router.push('/'); return }
    setBooking(JSON.parse(b))
    fetch('/api/queue').then(r => r.json()).then(setQueue)
  }, [])

  if (!booking) return null

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full space-y-6 text-center">
        <div className="text-5xl">✅</div>
        <div>
          <p className="text-sm text-gray-500">受付が完了しました</p>
          <p className="text-lg font-bold text-gray-800 mt-1">{DEPT_LABEL[booking.department]}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-6">
          <p className="text-sm text-gray-500 mb-1">あなたの受付番号</p>
          <p className="text-6xl font-black text-green-700 tracking-wider">{String(booking.queue_number).padStart(3, '0')}</p>
        </div>
        {queue && (
          <div className="text-sm text-gray-500">
            <p>現在 <span className="font-bold text-gray-800">{String(queue[booking.department]?.current || 0).padStart(3,'0')}</span> 番を案内中</p>
            <p className="text-xs text-gray-400 mt-1">混雑状況は変わります。受付番号が近くなったら来院ください。</p>
          </div>
        )}
        <p className="text-xs text-gray-400">受付番号はメールにも送信しました</p>
        <div className="space-y-2">
          <button onClick={() => router.push('/status')} className="w-full border border-green-300 text-green-700 font-semibold py-3 rounded-xl text-sm">混雑状況を確認する</button>
          <button onClick={() => router.push('/book')} className="w-full text-sm text-gray-400 py-2">予約画面に戻る</button>
        </div>
      </div>
    </div>
  )
}