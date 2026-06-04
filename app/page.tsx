'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [patientId, setPatientId] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError(''); setLoading(true)
    const bd = birthdate.replace(/-/g, '')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, birthdate: bd }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      sessionStorage.setItem('patient', JSON.stringify(data.patient))
      router.push('/book')
    } catch { setError('通信エラーが発生しました') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">🏥</div>
          <p className="text-xs text-gray-400">はまもと整形外科クリニック</p>
          <h1 className="text-xl font-bold text-gray-800 mt-1">受付システム</h1>
        </div>
        <div className="bg-green-50 rounded-xl px-4 py-3 text-sm text-green-800 text-center">
          診察券に記載の情報でログインしてください
        </div>
        {error && <p className="text-red-500 text-sm text-center bg-red-50 rounded-lg p-3">{error}</p>}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">診察券番号（6桁）</label>
            <input
              type="tel" value={patientId} onChange={e => setPatientId(e.target.value.slice(0,6))}
              placeholder="例：999999"
              maxLength={6}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-center text-xl tracking-widest focus:outline-none focus:border-green-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">生年月日</label>
            <input
              type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-400"
            />
          </div>
        </div>
        <button
          onClick={handleLogin}
          disabled={patientId.length !== 6 || !birthdate || loading}
          className="w-full bg-green-600 text-white font-bold py-4 rounded-xl text-base disabled:opacity-40"
        >
          {loading ? 'ログイン中...' : 'ログイン →'}
        </button>
        <p className="text-xs text-gray-400 text-center">
          受付時間：平日 8:00〜18:00
        </p>
      </div>
    </div>
  )
}