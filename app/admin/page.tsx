'use client'

import { useState, useEffect, useCallback } from 'react'

type Booking = {
  id: string
  name: string
  phone: string
  date: string
  time: string
  symptom: string
  note: string
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: string
}

const STATUS_LABEL = { pending: { label: '未確認', color: 'bg-yellow-100 text-yellow-800' }, confirmed: { label: '確認済', color: 'bg-green-100 text-green-800' }, cancelled: { label: 'ねャンスル', color: 'bg-gray-100 text-gray-500' } } as const

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchBookings = useCallback(async (key: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/bookings', { headers: { 'x-admin-key': key } })
      if (!res.ok) throw new Error('error')
      setBookings(await res.json())
    } catch { setError('データ取得に失敗しました') } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (authed && adminKey) fetchBookings(adminKey) }, [authed, adminKey, fetchBookings])

  if (!authed) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-sm space-y-5">
        <h1 className="text-xl font-bold text-center">管理ログイび</h1>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && (setAdminKey(password), setAuthed(true))} placeholder="パスワード" className="w-full border rounded-lg px-4 py-2.5 text-sm" />
        <button onClick={() => { setAdminKey(password); setAuthed(true) }} disabled={!password} className="w-full bg-blue-700 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40">ログイび</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white py-4 px-6 shadow">
        <h1>予約管理だッシポ</h1>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading && <p>読み诼み中...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {bookings.map(b => (
          <div key={b.id} className="bg-white rounded-xl shadow p-5 mb-3">
            <p>{b.name} - {b.date} {b.time}</p>
            <p>{b.phone} - {b.symptom}</p>
            <span className={STATUS_LABEL[b.status].color}>{STATUS_LABEL[b.status].label}</span>
          </div>
        ))}
      </main>
    </div>
  )
}
