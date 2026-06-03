'use client'

import { useState, ChangeEvent } from 'react'

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
]

const SYMPTOMS = [
  '腰・背中の痛み',
  '膝の痛み',
  '肩・首の痛み',
  '手・腕の痛み',
  '足・足首の痛み',
  '骨折・打撲',
  '交通事故・労災',
  'その他',
]

type Step = 'form' | 'confirm' | 'done'

export default function BookingPage() {
  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', phone: '', date: '', time: '', symptom: '', note: '',
  })
  const today = new Date().toISOString().split('T')[0]
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }
  const isFormValid = form.name && form.phone && form.date && form.time && form.symptom

  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error('error')
      setStep('done')
    } catch { setError('送信中にエラーが発生しました。時間をおいて再度お試しください。') }
    finally { setLoading(false) }
  }

  if (step === 'done') return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-md w-full text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-bold text-green-700">予約を受け付けました</h2>
        <p className="text-sm text-gray-600"><span className="font-semibold">{form.name}</span> 様<br />{form.date}（{form.time}）<br />{form.symptom}</p>
        <p className="text-xs text-gray-400">クリニックより確認のご連絡をする場合があります。</p>
        <button onClick={() => { setStep('form'); setForm({ name: '', phone: '', date: '', time: '', symptom: '', note: '' }) }} className="mt-2 text-sm text-green-600 underline">別の予約をする</button>
      </div>
    </div>
  )

  if (step === 'confirm') return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-md w-full space-y-5">
        <h2 className="text-lg font-bold text-gray-800 text-center">予約内容の確認</h2>
        <div className="bg-green-50 rounded-xl p-4 space-y-2 text-sm">
          {[['お名前', form.name], ['電話番号', form.phone], ['日付', form.date], ['時間', form.time], ['症状', form.symptom], ...(form.note ? [['備考', form.note]] : [])].map(([l, v]) => (
            <div key={l} className="flex gap-2"><span className="text-gray-500 w-20 shrink-0">{l}</span><span className="text-gray-800 font-medium">{v}</span></div>
          ))}
        </div>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <div className="flex gap-3">
          <button onClick={() => setStep('form')} className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl text-sm font-semibold">修正する</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-green-600 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50">{loading ? '送信中...' : 'この内容で予約する'}</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-green-50">
      <header className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">＋</div>
        <div>
          <p className="text-xs text-gray-400">はまもと整形外科クリニック</p>
          <h1 className="text-base font-bold text-gray-800">オンライン診療予約</h1>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="bg-green-100 rounded-xl px-4 py-3 text-sm text-green-800">📋 受付時間：平日 9:00〜12:00 / 14:00〜17:00</div>
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">お名前 <span className="ml-1 text-xs text-green-600 font-normal">必須</span></label>
            <input name="name" type="text" value={form.name} onChange={handleChange} placeholder="山田 太郎" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-400" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">電話番号 <span className="ml-1 text-xs text-green-600 font-normal">必須</span></label>
            <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="090-0000-0000" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-400" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">ご希望日 <span className="ml-1 text-xs text-green-600 font-normal">必須</span></label>
            <input name="date" type="date" value={form.date} onChange={handleChange} min={today} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-400" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">ご希望時間 <span className="ml-1 text-xs text-green-600 font-normal">必須</span></label>
            <select name="time" value={form.time} onChange={handleChange} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-400 bg-white">
              <option value="">選択してください</option>
              {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">症状・受診理由 <span className="ml-1 text-xs text-green-600 font-normal">必須</span></label>
            <select name="symptom" value={form.symptom} onChange={handleChange} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-400 bg-white">
              <option value="">選択してください</option>
              {SYMPTOMS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">備考 <span className="ml-1 text-xs text-gray-400 font-normal">任意</span></label>
            <textarea name="note" value={form.note} onChange={handleChange} placeholder="その他お伝えしたいことがあればご記入ください" rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-400 resize-none" />
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center">ご入力いただいた個人情報は予約管理のみに使用します。</p>
        <button onClick={() => setStep('confirm')} disabled={!isFormValid} className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl text-base disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">予約内容を確認する →</button>
      </main>
    </div>
  )
}