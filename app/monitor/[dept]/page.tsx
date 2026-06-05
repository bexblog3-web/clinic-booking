'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'

const DEPT_LABEL: Record<string, string> = {
  ent: '耳鼻科',
  orthopedics: '整形外科',
}

type BookingEntry = {
  queue_number: number
  status: string
}

type QueueInfo = {
  current: number
  next: number | null
  all_numbers: BookingEntry[]
}

export default function MonitorPage() {
  const params = useParams()
  const dept = params?.dept as string
  const [info, setInfo] = useState<QueueInfo>({ current: 0, next: null, all_numbers: [] })
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
    <div className="min-h-screen bg-green-50 flex flex-col items-center p-6">
      {/* Header */}
      <header className="w-full max-w-4xl mb-6 bg-white rounded-2xl shadow-sm px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 font-semibold">はまもと整形外科クリニック</p>
          <h1 className="text-2xl font-bold text-green-700">{DEPT_LABEL[dept] ?? dept} 待合モニター</h1>
        </div>
        <span className="text-3xl font-mono font-bold text-green-700">{time}</span>
      </header>

      {/* Current + Next */}
      <div className="w-full max-w-4xl grid grid-cols-2 gap-4 mb-6">
        {/* Current */}
        <div className="bg-green-700 rounded-2xl p-8 text-center shadow-md">
          <p className="text-green-200 text-lg font-semibold mb-2">現在診察中</p>
          <div className="text-9xl font-black text-white leading-none">
            {info.current === 0
              ? <span className="text-5xl text-green-400">—</span>
              : String(info.current).padStart(3, '0')}
          </div>
          <p className="text-green-300 text-sm mt-3">番</p>
        </div>

        {/* Next */}
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border-2 border-green-200">
          <p className="text-gray-500 text-lg font-semibold mb-2">次の番号</p>
          <div className="text-9xl font-black text-green-600 leading-none">
            {info.next === null
              ? <span className="text-5xl text-gray-300">—</span>
              : String(info.next).padStart(3, '0')}
          </div>
          <p className="text-gray-400 text-sm mt-3">番</p>
        </div>
      </div>

      {/* All numbers grid */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h2 className="text-xs text-gray-400 font-semibold mb-4">受付済み番号一覧</h2>
        {info.all_numbers.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">本日の受付はまだありません</p>
        ) : (
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10">
            {info.all_numbers.map(({ queue_number, status }) => {
              const isCurrent = queue_number === info.current
              const isDone = status === 'done' || status === 'called'
              const isNext = queue_number === info.next && !isCurrent

              let tileClass = 'rounded-xl p-3 text-center text-sm font-bold '
              let numClass = 'text-base font-black '

              if (isCurrent) {
                tileClass += 'bg-green-700 text-white shadow-md ring-2 ring-green-400'
                numClass += 'text-white'
              } else if (isNext) {
                tileClass += 'bg-green-100 border-2 border-green-500 text-green-700'
                numClass += 'text-green-700'
              } else if (isDone) {
                tileClass += 'bg-gray-100 text-gray-400'
                numClass += 'text-gray-400 line-through'
              } else {
                tileClass += 'bg-green-50 text-green-800'
                numClass += 'text-green-800'
              }

              return (
                <div key={queue_number} className={tileClass}>
                  <span className={numClass}>{String(queue_number).padStart(3, '0')}</span>
                  {isCurrent && <p className="text-xs mt-1 text-green-200">診察中</p>}
                  {isNext && <p className="text-xs mt-1 text-green-600">次</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer message */}
      <p className="text-gray-500 text-sm">お名前を呼ばれましたら診察室にお入りください</p>
    </div>
  )
}
