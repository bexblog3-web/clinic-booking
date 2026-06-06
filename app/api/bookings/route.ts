import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyPatientToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Map admin keys to their allowed departments (null = all departments)
const ADMIN_KEY_DEPT: Record<string, string | null> = {
[process.env.ADMIN_KEY_STAFF ?? 'key-staff-secret']: null,
[process.env.ADMIN_KEY_ORTHO ?? 'key-ortho-secret']: 'orthopedics',
[process.env.ADMIN_KEY_ENT ?? 'key-ent-secret']: 'ent',
}

function sanitize(str: string): string {
return str.replace(/[<>"'&]/g, c =>
({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' }[c] ?? c)
)
}

export async function GET(req: NextRequest) {
const supabase = getSupabaseAdmin()
const adminKey = req.headers.get('x-admin-key')
const { searchParams } = new URL(req.url)
const department = searchParams.get('department')

// Admin key auth
if (adminKey && adminKey in ADMIN_KEY_DEPT) {
const allowedDept = ADMIN_KEY_DEPT[adminKey]
if (allowedDept && department && department !== allowedDept) {
return NextResponse.json({ error: '権限がありません' }, { status: 403 })
}
let query = supabase.from('bookings').select('*').order('queue_number')
if (allowedDept) query = query.eq('department', allowedDept)
else if (department) query = query.eq('department', department)
const today = new Date(Date.now() + 9*60*60*1000).toISOString().slice(0, 10)
query = query.eq('booking_date', today)
const { data, error } = await query
if (error) return NextResponse.json({ error: '予約の取得に失敗しました' }, { status: 500 })
return NextResponse.json(data)
}

// Patient token auth
const cookieStore = await cookies()
const token = cookieStore.get('patient_token')?.value
if (token) {
const payload = await verifyPatientToken(token)
if (payload) {
const patientIdParam = searchParams.get('patientId')
const targetId = patientIdParam ?? payload.patientId
if (targetId !== payload.patientId) {
return NextResponse.json({ error: '権限がありません' }, { status: 403 })
}
const { data, error } = await supabase
.from('bookings')
.select('id, department, queue_number, booking_date, status, created_at')
.eq('patient_id', payload.patientId)
.order('booking_date', { ascending: false })
if (error) return NextResponse.json({ error: '予約の取得に失敗しました' }, { status: 500 })
return NextResponse.json(data)
}
}

return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
}

export async function POST(req: NextRequest) {
const supabase = getSupabaseAdmin()
const body = await req.json()
const { patientId, department, symptomDetail, email } = body

if (!patientId || !department) {
return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
}

// Verify patient exists
const { data: patient, error: patientError } = await supabase
.from('patients')
.select('id, name')
.eq('id', patientId)
.single()

if (patientError || !patient) {
return NextResponse.json({ error: '患者情報が見つかりません' }, { status: 404 })
}

const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000)
const today = nowJST.toISOString().slice(0, 10)

// Check business hours (JST)
const { data: settingsData } = await supabase.from('settings').select('key, value')
const settings = Object.fromEntries((settingsData ?? []).map((r: {key: string, value: string}) => [r.key, r.value]))
const openHour = parseInt(settings.open_hour ?? '8')
const closeHour = parseInt(settings.close_hour ?? '18')
const closedDates: string[] = JSON.parse(settings.closed_dates ?? '[]')
const nowHourJST = nowJST.getUTCHours()
if (nowHourJST < openHour || nowHourJST >= closeHour || closedDates.includes(today)) {
return NextResponse.json({ error: '受付時間外です' }, { status: 400 })
}

// Skip duplicate check for test patient
if (patientId !== '999999') {
const { data: existing } = await supabase
.from('bookings')
.select('id')
.eq('patient_id', patientId)
.eq('department', department)
.eq('booking_date', today)
.not('status', 'eq', 'cancelled')
.single()
if (existing) return NextResponse.json({ error: '本日この診療科はすでに予約済みです' }, { status: 409 })
}

// Get next queue number
const { data: lastQueue } = await supabase
.from('bookings')
.select('queue_number')
.eq('department', department)
.eq('booking_date', today)
.order('queue_number', { ascending: false })
.limit(1)

const queueNumber = ((lastQueue?.[0]?.queue_number ?? 0) + 1)

// Sanitize free-text inputs
const sanitizedSymptom = symptomDetail ? sanitize(symptomDetail) : null

const { data: booking, error } = await supabase
.from('bookings')
.insert({
patient_id: patientId,
department,
queue_number: queueNumber,
booking_date: today,
status: 'waiting',
symptom_detail: sanitizedSymptom,
})
.select()
.single()

if (error) {
return NextResponse.json({ error: '予約の登録に失敗しました' }, { status: 500 })
}

// Send confirmation email
if (email && process.env.RESEND_API_KEY) {
try {
await fetch('https://api.resend.com/emails', {
method: 'POST',
headers: {
'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
'Content-Type': 'application/json',
},
body: JSON.stringify({
from: 'onboarding@resend.dev',
to: email,
subject: '予約完了のお知らせ',
html: `<p>${patient.name}様、ご予約を承りました。</p><p>診療科: ${department === 'orthopedics' ? '整形外科' : '耳鼻科'}</p><p>受付番号: ${String(queueNumber).padStart(3, '0')}</p>`,
}),
})
} catch {}
}

return NextResponse.json({ booking, queue_number: queueNumber }, { status: 201 })
}
