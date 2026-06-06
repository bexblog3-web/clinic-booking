'use client'
import { useEffect, useState } from 'react'

const DEPT_LABEL: Record<string, string> = { ent: '耳鼻科', orthopedics: '整形外科' }

export default function StatusPage() {
  const [queue, setQueue] = useState<any>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  const fetchQueue = async () => {
    const res = await fetch('/api/queue')
    setQueue(await res.json())
    setLastUpdate(new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo' }))
  }

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 15000)
    return () => clearInterval(interval)
  }, [])

  const jstHour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getHours()
  const isOpen = jstHour >= 8 && jstHour < 18

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <p className="text-gray-400 text-sm">すこやかクリニック</p>
          <h1 className="text-white text-2xl font-bold mt-1">受付状況</h1>
          {!isOpen && <p className="text-yellow-400 text-sm mt-2">{jstHour < 8 ? '受付は8:00から開始' : '本日の受付は終了'}</p>}
        </div>
        <div className="grid grid-cols-1 gap-4">
          {['ent', 'orthopedics'].map(dept => (
            <div key={dept} className="bg-gray-800 rounded-2xl p-6">
              <p className="text-gray-400 text-sm font-semibold mb-4">{DEPT_LABEL[dept]}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-gray-400 text-xs mb-2">現在診察中</p>
                  <p className="text-6xl font-black text-white">
                    {queue ? String(queue[dept]?.current || 0).padStart(3, '0') : '---'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-xs mb-2">次の予定</p>
                  <p className="text-6xl font-black text-green-400">
                    {queue?.[dept]?.next ? String(queue[dept].next).padStart(3, '0') : '---'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-gray-600 text-xs text-center">最終更新: {lastUpdate}　（15秒ごとに自動更新）</p>
        <div className="text-center">
          <a href="/" className="text-gray-500 text-sm underline">予約画面へ</a>
        </div>
      </div>
    </div>
  )
}
