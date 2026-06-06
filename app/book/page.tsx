'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const DEPT_LABEL: Record<string, string> = { ent: '耳鼻科', orthopedics: '整形外科' }

export default function BookPage() {
  const router = useRouter()
  const [patient, setPatient] = useState<any>(null)
  const [queue, setQueue] = useState<any>(null)
  const [existingBookings, setExistingBookings] = useState<any[]>([])
  const [department, setDepartment] = useState('')
  const [symptomSince, setSymptomSince] = useState('')
  const [symptomDetail, setSymptomDetail] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('patient')
    if (!stored) { router.push('/'); return }
    const p = JSON.parse(stored)
    setPatient(p)
    fetchQueue()
    fetchExisting(p.id)
  }, [])

  const fetchQueue = async () => {
    const res = await fetch('/api/queue')
    setQueue(await res.json())
  }

  const fetchExisting = async (id: string) => {
    const res = await fetch('/api/bookings?patientId=' + id)
    setExistingBookings(await res.json())
  }

  const handleCancel = async (bookingId: string) => {
    await fetch('/api/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bookingId, status: 'cancelled' }),
    })
    fetchExisting(patient.id)
  }

  const handleSubmit = async () => {
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id, department, symptomSince, symptomDetail, email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      sessionStorage.setItem('lastBooking', JSON.stringify(data))
      router.push('/complete')
    } catch { setError('通信エラーが発生しました') }
    finally { setLoading(false) }
  }

  const isFormValid = department && symptomDetail && email
  const alreadyBooked = existingBookings.find(b => b.department === department)

  if (!patient) return <div className="min-h-screen bg-green-50 flex items-center justify-center"><p>読み込み中...</p></div>

  const now = new Date()
  const jstHour = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getHours()
  const isOpen = jstHour >= 8 && jstHour < 18

  return (
    <div className="min-h-screen bg-green-50">
      <header className="bg-white shadow-sm px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">すこやかクリニック</p>
          <h1 className="text-base font-bold text-gray-800">受付番号の取得</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">ログイン中</p>
          <p className="text-sm font-bold text-green-700">{patient.name} さん</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* 現在の受付状況 */}
        {queue && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-3 font-semibold">現在の受付状況</p>
            <div className="grid grid-cols-2 gap-3">
              {['ent', 'orthopedics'].map(dept => (
                <div key={dept} className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">{DEPT_LABEL[dept]}</p>
                  <p className="text-2xl font-bold text-green-700">{String(queue[dept]?.current || 0).padStart(3, '0')}</p>
                  <p className="text-xs text-gray-400">診察中</p>
                  {queue[dept]?.next && <p className="text-xs text-yellow-600 mt-1">次→ {String(queue[dept].next).padStart(3, '0')}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 既存の予約 */}
        {existingBookings.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
            <p className="text-xs text-gray-400 font-semibold">本日の予約</p>
            {existingBookings.map(b => (
              <div key={b.id} className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3">
                <div>
                  <p className="font-bold text-green-700">{DEPT_LABEL[b.department]}　{String(b.queue_number).padStart(3,'0')}番</p>
                  <p className="text-xs text-gray-500">{b.symptom_detail?.slice(0,20)}</p>
                </div>
                <button onClick={() => handleCancel(b.id)} className="text-xs text-gray-400 border border-gray-200 px-2 py-1 rounded-lg">キャンセル</button>
              </div>
            ))}
          </div>
        )}

        {!isOpen ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-gray-500">受付時間外です</p>
            <p className="text-sm text-gray-400 mt-1">{jstHour < 8 ? '本日の受付は8:00から開始です' : '本日の受付は終了しました。翌日8:00から受付開始です'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <p className="text-sm font-bold text-gray-700">新規受付</p>
            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{error}</p>}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">診療科 <span className="text-xs text-green-600">必須</span></label>
              <select value={department} onChange={e => setDepartment(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-green-400">
                <option value="">選択してください</option>
                {!existingBookings.find(b => b.department === 'ent') && <option value="ent">耳鼻科</option>}
                {!existingBookings.find(b => b.department === 'orthopedics') && <option value="orthopedics">整形外科</option>}
              </select>
              {alreadyBooked && <p className="text-xs text-orange-500">この診療科は本日すでに受付済みです</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">いつから症状がありますか？</label>
              <input type="text" value={symptomSince} onChange={e => setSymptomSince(e.target.value)} placeholder="例：3日前から、今朝から" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-400" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">症状を教えてください <span className="text-xs text-green-600">必須</span></label>
              <textarea value={symptomDetail} onChange={e => setSymptomDetail(e.target.value)} placeholder="例：右膝が痛くて歩きにくい" rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-green-400" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">メールアドレス <span className="text-xs text-green-600">必須</span></label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="例：sample@example.com" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-400" />
              <p className="text-xs text-gray-400">受付番号をメールで送ります</p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!isFormValid || loading}
              className="w-full bg-green-600 text-white font-bold py-4 rounded-xl text-base disabled:opacity-40"
            >
              {loading ? '受付中...' : '受付番号を取得する →'}
            </button>
          </div>
        )}
        <button onClick={() => { sessionStorage.clear(); router.push('/') }} className="w-full text-sm text-gray-400 text-center py-2">ログアウト</button>
      </main>
    </div>
  )
}
