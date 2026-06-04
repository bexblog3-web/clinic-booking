'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ROLES = [
  { label: '受付スタッフ', key: 'staff', path: '/admin/staff' },
  { label: '整形外科（先生）', key: 'ortho', path: '/admin/doctor/orthopedics' },
  { label: '耳鼻科（先生）', key: 'ent', path: '/admin/doctor/ent' },
]

export default function AdminLoginPage() {
  const router = useRouter()
  const [role, setRole] = useState('staff')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      sessionStorage.setItem('adminKey', data.key)
      sessionStorage.setItem('adminRole', role)
      router.push(ROLES.find(r => r.key === role)!.path)
    } catch { setError('通信エラーが発生しました') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="text-3xl mb-2">🏥</div>
          <h1 className="text-xl font-bold text-gray-800">管理者ログイン</h1>
          <p className="text-xs text-gray-400 mt-1">はまもと整形外科クリニック</p>
        </div>
        {error && <p className="text-red-500 text-sm text-center bg-red-50 rounded-lg p-3">{error}</p>}
        <div className="space-y-1">
          <label className="text-sm font-semibold text-gray-700">ログイン区分</label>
          <select value={role} onChange={e => setRole(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white">
            {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-gray-700">パスワード</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && password && handleLogin()}
            placeholder="パスワードを入力" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <button onClick={handleLogin} disabled={!password || loading} className="w-full bg-gray-800 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40">
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </div>
    </div>
  )
}