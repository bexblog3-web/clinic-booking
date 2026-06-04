import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

function isOpen() {
  const now = new Date()
  const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
  const h = jst.getHours()
  return h >= 8 && h < 18
}

function today() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const adminKey = req.headers.get('x-admin-key')
  const dept = req.nextUrl.searchParams.get('department')
  const patientId = req.nextUrl.searchParams.get('patientId')

  // 管理者: 予約一覧
  if (adminKey) {
    const validKeys = [
      process.env.ADMIN_STAFF_KEY,
      process.env.ADMIN_ORTHO_KEY,
      process.env.ADMIN_ENT_KEY,
    ]
    if (!validKeys.includes(adminKey)) return NextResponse.json({ error: '認証エラー' }, { status: 401 })
    let q = supabase.from('bookings')
      .select('*, patients(name, phone, address)')
      .eq('booking_date', today())
      .order('queue_number')
    if (dept) q = q.eq('department', dept)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // 患者: 本日の予約確認
  if (patientId) {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('patient_id', patientId)
      .eq('booking_date', today())
      .neq('status', 'cancelled')
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: '不正なリクエスト' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  if (!isOpen()) return NextResponse.json({ error: '受付時間外です' }, { status: 400 })

  const { patientId, department, symptomSince, symptomDetail, email } = await req.json()
  if (!patientId || !department || !symptomDetail) return NextResponse.json({ error: '必須項目が未入力です' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const t = today()

  // 同診療科・同日の重複チェック
  const { data: existing } = await supabase
    .from('bookings')
    .select('id')
    .eq('patient_id', patientId)
    .eq('department', department)
    .eq('booking_date', t)
    .neq('status', 'cancelled')
    .single()
  if (existing) return NextResponse.json({ error: '本日この診療科はすでに予約済みです' }, { status: 409 })

  // 次の受付番号を取得
  const { data: last } = await supabase
    .from('bookings')
    .select('queue_number')
    .eq('department', department)
    .eq('booking_date', t)
    .order('queue_number', { ascending: false })
    .limit(1)
    .single()

  const nextNum = last ? last.queue_number + 1 : 1
  if (nextNum > 100) return NextResponse.json({ error: '本日の受付は終了しました（上限100人）' }, { status: 400 })

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert([{ patient_id: patientId, department, queue_number: nextNum, symptom_since: symptomSince, symptom_detail: symptomDetail, email, status: 'booked', booking_date: t }])
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(booking, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  const validKeys = [
    process.env.ADMIN_STAFF_KEY,
    process.env.ADMIN_ORTHO_KEY,
    process.env.ADMIN_ENT_KEY,
  ]
  if (!validKeys.includes(adminKey || '')) return NextResponse.json({ error: '認証エラー' }, { status: 401 })

  const { id, status } = await req.json()
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}