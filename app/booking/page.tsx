'use client'
import { useState, useEffect, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
const DEPT: Record<string,string> = { ear_nose:'耳鼻科', orthopedics:'整形外科' }
export default function BookingPage() {
  const router = useRouter()
  const [patient, setPatient] = useState<any>(null)
  const [queue, setQueue] = useState<any>(null)
  const [form, setForm] = useState({ department:'', symptom_since:'', symptom_detail:'', email:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [timeMsg, setTimeMsg] = useState('')
  useEffect(() => {
    const p = sessionStorage.getItem('patient')
    if (!p) { router.push('/'); return }
    setPatient(JSON.parse(p))
    const h = new Date().getHours()
    if (h < 8) setTimeMsg('本日の受付は8:00から開始です。')
    else if (h >= 18) setTimeMsg('本日の受付は終了しました。翌日8:00から受付開始です。')
    fetch('/api/queue').then(r => r.json()).then(setQueue)
  }, [router])
  const handleChange = (e: ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => setForm({...form,[e.target.name]:e.target.value})
  const isValid = form.department && form.symptom_since && form.symptom_detail && form.email
  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,patient_id:patient.id})})
      const data = await res.json()
      if (!res.ok) throw new Error(data.error||'エラー')
      sessionStorage.setItem('booking', JSON.stringify(data))
      router.push('/complete')
    } catch(e:any){setError(e.message)} finally{setLoading(false)}
  }
  if (!patient) return null
  if (timeMsg) return <div className="min-h-screen bg-green-50 flex items-center justify-center px-4"><div className="bg-white rounded-2xl shadow p-8 max-w-sm w-full text-center space-y-4"><div className="text-4xl">⏰</div><p className="text-gray-700 font-semibold">{timeMsg}</p><button onClick={()=>router.push('/')} className="text-sm text-green-600 underline">トップに戻る</button></div></div>
  return (
    <div className="min-h-screen bg-green-50">
      <header className="bg-white shadow-sm px-4 py-4"><p className="text-xs text-gray-400">すこやかクリニック</p><h1 className="text-base font-bold text-gray-800">{patient.name}さん、こんにちは</h1></header>
      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {queue && <div className="grid grid-cols-2 gap-3">{Object.entries(DEPT).map(([k,l])=><div key={k} className="bg-white rounded-xl p-3 shadow-sm text-center"><p className="text-xs text-gray-500">{l} 現在案内中</p><p className="text-2xl font-bold text-green-600">{queue[k]?.current_number>0?String(queue[k].current_number).padStart(3,'0'):'---'}</p></div>)}</div>}
        <div className="bg-green-100 rounded-xl px-4 py-3 text-sm text-green-800">📋 受付時間：平日 8:00〜18:00（先着100名）</div>
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div className="space-y-1"><label className="text-sm font-semibold text-gray-700">診療科 <span className="text-green-600 text-xs">必須</span></label>
            <select name="department" value={form.department} onChange={handleChange} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-400 bg-white"><option value="">選択してください</option><option value="ear_nose">耳鼻科</option><option value="orthopedics">整形外科</option></select></div>
          <div className="space-y-1"><label className="text-sm font-semibold text-gray-700">いつから <span className="text-green-600 text-xs">必須</span></label>
            <input name="symptom_since" value={form.symptom_since} onChange={handleChange} placeholder="例：3日前から" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-400" /></div>
          <div className="space-y-1"><label className="text-sm font-semibold text-gray-700">症状 <span className="text-green-600 text-xs">必須</span></label>
            <textarea name="symptom_detail" value={form.symptom_detail} onChange={handleChange} placeholder="例：右膝が痛い" rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-400 resize-none" /></div>
          <div className="space-y-1"><label className="text-sm font-semibold text-gray-700">メールアドレス <span className="text-green-600 text-xs">受付番号をお送りします</span></label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="example@email.com" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-400" /></div>
        </div>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <button onClick={handleSubmit} disabled={!isValid||loading} className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl text-base disabled:opacity-40">{loading?'受付中...':'受付番号を取得する →'}</button>
        <p className="text-xs text-gray-400 text-center">受付後はクリニックへお越しください。窓口での受付も必要です。</p>
      </main>
    </div>
  )
}
