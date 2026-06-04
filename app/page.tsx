'use client'
import { useState, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ patient_id: '', birthdate: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value })
  const handleLogin = async () => {
    if (form.patient_id.length !== 6 || form.birthdate.length !== 8) { setError('診察券番号（6桁）と生年月日（8桁）を入力してください'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/patient', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'エラーが発生しました')
      sessionStorage.setItem('patient', JSON.stringify(data.patient))
      router.push('/booking')
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }
  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm space-y-6">
        <div className="text-center"><div className="text-5xl mb-3">🏥</div>
          <h1 className="text-xl font-bold text-gray-800">はまもと整形外科クリニック</h1>
          <p className="text-sm text-gray-500 mt-1">オンライン受付</p></div>
        {error && <p className="text-red-500 text-sm text-center bg-red-50 rounded-lg p-2">{error}</p>}
        <div className="space-y-4">
          <div className="space-y-1"><label className="text-sm font-semibold text-gray-700">診察券番号 <span className="text-green-600 font-normal text-xs">6桁</span></label>
            <input name="patient_id" type="tel" value={form.patient_id} onChange={handleChange} maxLength={6} placeholder="999999" className="w-full border border-gray-200 rounded-lg px-3 py-3 text-center text-xl tracking-widest focus:outline-none focus:border-green-400" /></div>
          <div className="space-y-1"><label className="text-sm font-semibold text-gray-700">生年月日 <span className="text-green-600 font-normal text-xs">西暦8桁（例：19900101）</span></label>
            <input name="birthdate" type="tel" value={form.birthdate} onChange={handleChange} maxLength={8} placeholder="19900101" className="w-full border border-gray-200 rounded-lg px-3 py-3 text-center text-xl tracking-widest focus:outline-none focus:border-green-400" /></div>
        </div>
        <button onClick={handleLogin} disabled={loading || form.patient_id.length !== 6 || form.birthdate.length !== 8} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl text-base disabled:opacity-40">{loading ? '確認中...' : '受付を開始する'}</button>
        <p className="text-xs text-gray-400 text-center">診察券番号・生年月日がわからない場合は受付窓口にお声がけください</p>
      </div></div>)
}