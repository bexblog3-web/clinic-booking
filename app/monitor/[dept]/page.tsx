'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'

const DEPT_LABEL: Record<string, string> = {
  ent: '耳鼻科',
  orthopedics: '整形外科',
}

type QueueInfo = {
  current: number
  next: number | null
}

export default function MonitorPage() {
  const params = useParams()
  const dept = params?.dept as string
  const [info, setInfo] = useState<QueueInfo>({ current: 0, next: null })
  const [time, setTime] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/queue')
      const data = await res.json()
      if (data[dept]) setInfo(data[dept])
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchQueue()
    intervalRef.current = setInterval(fetchQueue, 10000)
    const clockInterval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }))
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      clearInterval(clockInterval)
    }
  }, [dept])

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-300">🏥 はまもと整形外科クリニック</h1>
        <span className="text-2xl font-mono text-gray-400">{time}</span>
      </div>
      <div className="w-full max-w-2xl mb-6">
        <div className="bg-blue-800 rounded-2xl px-8 py-4 text-center">
          <span className="text-3xl font-bold">{DEPT_LABEL[dept] ?? dept}</span>
        </div>
      </div>
      <div className="w-full max-w-2xl grid grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-3xl p-8 text-center">
          <p className="text-gray-400 text-lg mb-2">現在診察中</p>
          <div className="text-9xl font-black text-white leading-none">
            {info.current === 0 ? <span className="text-5xl text-gray-600">—</span> : info.current}
          </div>
          <p className="text-gray-500 text-sm mt-4">番</p>
        </div>
        <div className="bg-gray-700 rounded-3xl p-8 text-center">
          <p className="text-gray-400 text-lg mb-2">次の番号</p>
          <div className="text-9xl font-black text-yellow-300 leading-none">
            {info.next === null ? <span className="text-5xl text-gray-600">—</span> : info.next}
          </div>
          <p className="text-gray-500 text-sm mt-4">番</p>
        </div>
      </div>
      <div className="mt-10 text-gray-600 text-sm">
        お名前を呼ばれましたら診察室にお入りください
      </div>
    </div>
  )
}
