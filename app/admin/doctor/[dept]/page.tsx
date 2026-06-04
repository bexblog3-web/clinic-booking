'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

type Booking = {
  id: string
  queue_number: number
  patient_id: string
  status: string
}

type QueueStatus = {
  current: number
  next: number | null
}

const DEPT_MAP: Record<string, string> = {
  orthopedics: '整形外科',
  ent: '耳鼻科',
}

const ROLE_MAP: Record<string, string> = {
  orthopedics: 'ortho',
  ent: 'ent',
}

export default function DoctorPage() {
  const router = useRouter()
  const params = useParams()
  const dept = params?.dept as string
  const [waiting, setWaiting] = useState<Booking[]>([])
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({ current: 0, next: null })
  const [loading, setLoading] = useState(true)
  const [calling, setCalling] = useState(false)
  const [msg, setMsg] = useState('')
  const [adminKey, setAdminKey] = useState<string | null>(null)

  useEffect(() => {
    const key = sessionStorage.getItem('adminKey')
    const role = sessionStorage.getItem('adminRole')
    if (!key || role !== ROLE_MAP[dept]) { router.push('/admin'); return }
    setAdminKey(key)
  }, [dept])

  useEffect(() => {
    if (!adminKey) return
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [adminKey, dept])

  const fetchData = async () => {
    if (!adminKey) return
    setLoading(true)
    try {
      const [bookRes, queueRes] = await Promise.all([
        fetch(`/api/bookings?department=${dept}`, { headers: { 'x-admin-key': adminKey } }),
        fetch('/api/queue'),
      ])
      const bookData = await bookRes.json()
      const queueData = await queueRes.json()
      const arrivedBookings = (Array.isArray(bookData) ? bookData : [])
        .filter((b: Booking) => b.status === 'arrived')
        .sort((a: Booking, b: Booking) => a.queue_number - b.queue_number)
      setWaiting(arrivedBookings)
      if (queueData[dept]) setQueueStatus(queueData[dept])
    } finally {
      setLoading(false)
    }
  }

  const handleCallNext = async () => {
    setCalling(true)
    setMsg('')
    try {
      const res = await fetch('/api/admin/call-next', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey! },
      })
      const data = await res.json()
      if (!res.ok) { setMsg(`❌ ${data.error}`); return }
      setMsg(`📢 ${data.calledNumber}番の患者さんをお呼びしました`)
      setTimeout(() => setMsg(''), 5000)
      fetchData()
    } finally {
      setCalling(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">🏥 {DEPT_MAP[dept] ?? dept}　先生用画面</h1>
          <p className="text-xs text-gray-400">はまもと整形外科クリニック</p>
        </div>
        <button onClick={() => { sessionStorage.clear(); router.push('/admin') }}
          className="text-sm text-gray-500 hover:text-gray-700">ログアウト</button>
      </header>
      <main className="max-w-lg mx-auto p-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
          <p className="text-sm text-gray-400 mb-1">現在診察中</p>
          <div className="text-7xl font-black text-gray-800">{queueStatus.current === 0 ? '—' : queueStatus.current}</div>
          {queueStatus.next !== null && (
            <p className="text-sm text-gray-400 mt-3">次の番号：<span className="font-bold text-gray-600">{queueStatus.next}</span></p>
          )}
        </div>
        {msg && (
          <div className={`border rounded-lg p-3 text-sm text-center ${msg.startsWith('📢') ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-red-50 border-red-200 text-red-700'}`}>{msg}</div>
        )}
        <button onClick={handleCallNext} disabled={calling || waiting.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl text-xl shadow disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {calling ? '呼び出し中...' : `次の患者を呼ぶ（${waiting.length}人待ち）`}
        </button>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-gray-700">待機中の患者</h2>
            <button onClick={fetchData} className="text-sm text-gray-400 hover:text-gray-600">🔄 更新</button>
          </div>
          {loading ? <p className="text-center text-gray-400 py-4">読み込み中...</p>
            : waiting.length === 0 ? <p className="text-center text-gray-400 py-4">待機中の患者はいません</p>
            : (
              <div className="space-y-2">
                {waiting.map((b, i) => (
                  <div key={b.id} className={`flex items-center gap-3 p-3 rounded-lg ${i === 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                    <div className={`text-xl font-bold w-10 text-center ${i === 0 ? 'text-blue-700' : 'text-gray-600'}`}>{b.queue_number}</div>
                    <div className="text-sm text-gray-500">患者ID: {b.patient_id}</div>
                    {i === 0 && <span className="ml-auto text-xs text-blue-600 font-semibold">次の患者</span>}
                  </div>
                ))}
              </div>
            )}
        </div>
      </main>
    </div>
  )
}
