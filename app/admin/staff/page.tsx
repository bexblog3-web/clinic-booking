'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Booking = {
  id: string
  queue_number: number
  patient_id: string
  department: string
  status: string
  booking_date: string
  patients?: { name: string; phone: string }
}

const DEPT_LABEL: Record<string, string> = {
  ent: '耳鼻科',
  orthopedics: '整形外科',
}

export default function StaffPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [deptFilter, setDeptFilter] = useState<'all' | 'ent' | 'orthopedics'>('all')
  const [adminKey, setAdminKey] = useState<string | null>(null)

  useEffect(() => {
    const key = sessionStorage.getItem('adminKey')
    const role = sessionStorage.getItem('adminRole')
    if (!key || role !== 'staff') { router.push('/admin'); return }
    setAdminKey(key)
  }, [])

  useEffect(() => {
    if (adminKey) fetchBookings()
  }, [adminKey])

  const fetchBookings = async () => {
    if (!adminKey) return
    setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        headers: { 'x-admin-key': adminKey }
      })
      const data = await res.json()
      setBookings(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  const handleCheckin = async (bookingId: string) => {
    setCheckingIn(bookingId)
    setMsg('')
    try {
      const res = await fetch('/api/admin/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey! },
        body: JSON.stringify({ bookingId }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg(`❌ ${data.error}`); return }
      setMsg(`✅ 受付完了：${data.booking.queue_number}番`)
      fetchBookings()
    } finally {
      setCheckingIn(null)
    }
  }

  const filtered = bookings.filter(b =>
    deptFilter === 'all' ? true : b.department === deptFilter
  )

  const statusLabel = (s: string) => {
    if (s === 'booked') return { text: '予約済（未来院）', color: 'text-yellow-600 bg-yellow-50' }
    if (s === 'arrived') return { text: '来院済（待機中）', color: 'text-green-600 bg-green-50' }
    if (s === 'calling') return { text: '診察中', color: 'text-blue-600 bg-blue-50' }
    if (s === 'done') return { text: '完了', color: 'text-gray-400 bg-gray-50' }
    if (s === 'absent') return { text: '不在（呼出済）', color: 'text-orange-600 bg-orange-50' }
    if (s === 'cancelled') return { text: 'キャンセル', color: 'text-red-400 bg-red-50' }
    return { text: s, color: 'text-gray-500 bg-gray-50' }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">🏥 受付スタッフ画面</h1>
          <p className="text-xs text-gray-400">すこやかクリニック</p>
        </div>
        <button onClick={() => { sessionStorage.clear(); router.push('/admin') }}
          className="text-sm text-gray-500 hover:text-gray-700">ログアウト</button>
      </header>
      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {msg && <div className={`border rounded-lg p-3 text-sm ${msg.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>{msg}</div>}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'ent', 'orthopedics'] as const).map(d => (
            <button key={d} onClick={() => setDeptFilter(d)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${deptFilter === d ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border'}`}>
              {d === 'all' ? '全科' : DEPT_LABEL[d]}
            </button>
          ))}
          <button onClick={fetchBookings} className="ml-auto px-4 py-2 rounded-full text-sm bg-white border text-gray-600 hover:bg-gray-50">🔄 更新</button>
        </div>
        {loading ? (
          <div className="text-center py-10 text-gray-400">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400">本日の予約はありません</div>
        ) : (
          <div className="space-y-2">
            {filtered.sort((a, b) => a.queue_number - b.queue_number).map(b => {
              const sl = statusLabel(b.status)
              return (
                <div key={b.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
                  <div className="text-2xl font-bold text-gray-700 w-12 text-center">{b.queue_number}</div>
                  <div className="flex-1">
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="text-xs font-semibold text-gray-500">{DEPT_LABEL[b.department]}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${sl.color}`}>{sl.text}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">
                      {b.patients?.name ?? `患者ID: ${b.patient_id}`}
                      {b.patients?.phone && <span className="ml-2 text-gray-400">{b.patients.phone}</span>}
                    </div>
                  </div>
                  {b.status === 'booked' && (
                    <button onClick={() => handleCheckin(b.id)} disabled={checkingIn === b.id}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg disabled:opacity-40 hover:bg-green-700">
                      {checkingIn === b.id ? '処理中...' : '受付完了'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
