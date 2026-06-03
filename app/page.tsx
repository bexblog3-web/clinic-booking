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
    name: '',
    phone: '',
    date: '',
    time: '',
    symptom: '',
    note: '',
  })
  const today = new Date().toISOString().split('T')[0]
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setForm({ ...form, [e.target.name]: e.target.value }) }
  const isFormValid = form.name && form.phone && form.date && form.time && form.symptom
  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error('error')
      setStep('done')
    } catch { setError('送信中にエラーが発生しました') } finally { setLoading(false) }
  }
  return (<div className="min-h-screen bg-blue-50"><h1>オンライン診療予約</h1></div>)
}
