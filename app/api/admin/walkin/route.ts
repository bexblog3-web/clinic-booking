import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
const adminKey = req.headers.get('x-admin-key')
const staffKey = process.env.ADMIN_KEY_STAFF ?? 'key-staff-secret'
const orthoKey = process.env.ADMIN_KEY_ORTHO ?? 'key-ortho-secret'
const entKey = process.env.ADMIN_KEY_ENT ?? 'key-ent-secret'
const validKeys = [staffKey, orthoKey, entKey]
if (!validKeys.includes(adminKey ?? '')) {
return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
}

const body = await req.json()
const { patientName, department, phone } = body

if (!patientName || !department) {
return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
}

// Department isolation for non-staff keys
const allowedDept = adminKey === orthoKey ? 'orthopedics' : adminKey === entKey ? 'ent' : null
if (allowedDept && department !== allowedDept) {
return NextResponse.json({ error: '権限がありません' }, { status: 403 })
}

const supabase = getSupabaseAdmin()
const today = new Date(Date.now() + 9*60*60*1000).toISOString().slice(0, 10)

// Find or create patient by name+phone
let patientId: string
const { data: existing } = await supabase
.from('patients')
.select('id')
.eq('name', patientName)
.eq('phone', phone ?? '')
.maybeSingle()

if (existing) {
patientId = existing.id
} else {
// patients.id は自動採番されないため、当日受付用のIDを発行する（8始まりの6桁・重複時はリトライ）
let newPatient = null
let pErr = null
for (let attempt = 0; attempt < 5; attempt++) {
const walkinId = String(800000 + Math.floor(Math.random() * 100000))
const res = await supabase
.from('patients')
.insert({ id: walkinId, name: patientName, phone: phone ?? '' })
.select('id')
.single()
newPatient = res.data
pErr = res.error
if (newPatient) break
if (pErr && pErr.code !== '23505') break // 23505=重複エラー。それ以外は即中断
}
if (pErr || !newPatient) {
return NextResponse.json({ error: `患者登録に失敗しました: ${pErr?.message ?? '不明'}` }, { status: 500 })
}
patientId = newPatient.id
}

// Check duplicate
const { data: dup } = await supabase
.from('bookings')
.select('id')
.eq('patient_id', patientId)
.eq('department', department)
.eq('booking_date', today)
.not('status', 'eq', 'cancelled')
.maybeSingle()

if (dup) {
return NextResponse.json({ error: '本日この診療科はすでに予約済みです' }, { status: 409 })
}

// Get next queue number
const { data: lastQueue } = await supabase
.from('bookings')
.select('queue_number')
.eq('department', department)
.eq('booking_date', today)
.order('queue_number', { ascending: false })
.limit(1)

const queueNumber = (lastQueue?.[0]?.queue_number ?? 0) + 1

const { data: booking, error } = await supabase
.from('bookings')
.insert({
patient_id: patientId,
department,
queue_number: queueNumber,
booking_date: today,
status: 'arrived', // 窓口受付の患者はその場にいるため「来院済・待機中」で登録（旧: waiting は呼び出し対象外になるバグ）
})
.select()
.single()

if (error) {
return NextResponse.json({ error: '予約の登録に失敗しました' }, { status: 500 })
}

return NextResponse.json({ booking, queue_number: queueNumber }, { status: 201 })
}
