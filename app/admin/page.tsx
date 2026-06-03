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

const STATUS_LABEL = {
  pending:   { label: '未確認',  color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: '確認済',  color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'キャンセル', color: 'bg-gray-100 text-gray-500' },
} as const

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all')

  const fetchBookings = useCallback(async (key: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/bookings', { headers: { 'x-admin-key': key } })
      if (!res.ok) throw new Error('認証エラー')
      setBookings(await res.json())
    } catch (e: any) {
      setError(e.message || 'データ取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (authed && adminKey) fetchBookings(adminKey) }, [authed, adminKey, fetchBookings])

  const handleStatusChange = async (id: string, status: string) => {
    await fetch('/api/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ id, status }),
    })
    fetchBookings(adminKey)
  }

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  const today = new Date().toISOString().split('T')[0]
  const todayCount = bookings.filter(b => b.date === today && b.status !== 'cancelled').length
  const pendingCount = bookings.filter(b => b.status === 'pending').length

  if (!authed) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="text-3xl mb-2">🏥</div>
          <h1 className="text-xl font-bold text-gray-800">管理者ログイン</h1>
          <p className="text-sm text-gray-400 mt-1">はまもと整形外科クリニック</p>
        </div>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <input
          type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && password) { setAdminKey(password); setAuthed(true) } }}
          placeholder="パスワード"
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
        />
        <button
          onClick={() => { setAdminKey(password); setAuthed(true) }}
          disabled={!password}
          className="w-full bg-green-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40"
        >
          ログイン
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">はまもと整形外科クリニック</p>
          <h1 className="text-lg font-bold text-gray-800">予約管理ダッシュボード</h1>
        </div>
        <button onClick={() => fetchBookings(adminKey)} className="text-sm text-green-600 border border-green-200 px-3 py-1.5 rounded-lg">更新</button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* サマリー */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-green-600">{todayCount}</p>
            <p className="text-xs text-gray-500 mt-1">本日の予約</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
            <p className="text-xs text-gray-500 mt-1">未確認</p>
          </div>
        </div>

        {/* フィルター */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'confirmed', 'cancelled'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter === f ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              {f === 'all' ? 'すべて' : STATUS_LABEL[f].label}
              <span className="ml-1 opacity-70">({f === 'all' ? bookings.length : bookings.filter(b => b.status === f).length})</span>
            </button>
          ))}
        </div>

        {loading && <p className="text-center text-gray-400 py-8">読み込み中...</p>}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {/* 予約一覧 */}
        <div className="space-y-3">
          {filtered.length === 0 && !loading && (
            <p className="text-center text-gray-400 py-8">予約がありません</p>
          )}
          {filtered.map(b => (
            <div key={b.id} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-800">{b.name} 様</p>
                  <p className="text-sm text-gray-500">{b.phone}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${STATUS_LABEL[b.status].color}`}>
                  {STATUS_LABEL[b.status].label}
                </span>
              </div>
              <div className="flex gap-4 text-sm text-gray-600">
                <span>📅 {b.date}</span>
                <span>🕐 {b.time}</span>
              </div>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{b.symptom}</p>
              {b.note && <p className="text-xs text-gray-500">備考：{b.note}</p>}
              <div className="flex gap-2 pt-1">
                {b.status !== 'confirmed' && (
                  <button onClick={() => handleStatusChange(b.id, 'confirmed')} className="flex-1 bg-green-50 text-green-700 border border-green-200 py-2 rounded-lg text-xs font-semibold">✓ 確認済にする</button>
                )}
                {b.status !== 'cancelled' && (
                  <button onClick={() => handleStatusChange(b.id, 'cancelled')} className="flex-1 bg-gray-50 text-gray-500 border border-gray-200 py-2 rounded-lg text-xs font-semibold">✕ キャンセル</button>
                )}
                {b.status === 'cancelled' && (
                  <button onClick={() => handleStatusChange(b.id, 'pending')} className="flex-1 bg-yellow-50 text-yellow-700 border border-yellow-200 py-2 rounded-lg text-xs font-semibold">↩ 未確認に戻す</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}