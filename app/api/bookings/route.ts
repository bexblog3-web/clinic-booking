import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

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
        const today = new Date(Date.now() + 9*60*60*1000).toISOString().slice(0, 10)
        let query = supabase.from('bookings').select('*, patients(name, phone)').order('queue_number').eq('booking_date', today)
        if (allowedDept) query = query.eq('department', allowedDept)
        else if (department) query = query.eq('department', department)
        const { data, error } = await query
        if (error) return NextResponse.json({ error: '予約の取得に失敗しました' }, { status: 500 })
        return NextResponse.json(data)
  }

  // Patient: get today's own bookings by patientId
  const patientId = searchParams.get('patientId')
    if (patientId) {
          const today = new Date(Date.now() + 9*60*60*1000).toISOString().slice(0, 10)
          const { data, error } = await supabase
            .from('bookings')
            .select('id, department, queue_number, booking_date, status, symptom_detail')
            .eq('patient_id', patientId)
            .eq('booking_date', today)
            .neq('status', 'cancelled')
            .order('queue_number')
          if (error) return NextResponse.json({ error: '予約の取得に失敗しました' }, { status: 500 })
          return NextResponse.json(data)
    }

  return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
}

export async function POST(req: NextRequest) {
    const supabase = getSupabaseAdmin()
    const body = await req.json()
    const { patientId, department, symptomSince, symptomDetail, email } = body

  if (!patientId || !department) {
        return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

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

  const { data: settingsData } = await supabase.from('settings').select('key, value')
    const settings = Object.fromEntries((settingsData ?? []).map((r: {key: string, value: string}) => [r.key, r.value]))
    const openHour = parseInt(settings.open_hour ?? '8')
    const closeHour = parseInt(settings.close_hour ?? '18')
    const closedDates: string[] = JSON.parse(settings.closed_dates ?? '[]')
    const nowHourJST = nowJST.getUTCHours()
    if (nowHourJST < openHour || nowHourJST >= closeHour || closedDates.includes(today)) {
          return NextResponse.json({ error: '受付時間外です' }, { status: 400 })
    }

  if (patientId !== '999999') {
        const { data: existing } = await supabase
          .from('bookings')
          .select('id')
          .eq('patient_id', patientId)
          .eq('department', department)
          .eq('booking_date', today)
          .neq('status', 'cancelled')
          .maybeSingle()
        if (existing) return NextResponse.json({ error: '本日この診療科はすでに予約済みです' }, { status: 409 })
  }

  const { data: lastQueue } = await supabase
      .from('bookings')
      .select('queue_number')
      .eq('department', department)
      .eq('booking_date', today)
      .order('queue_number', { ascending: false })
      .limit(1)

  const queueNumber = ((lastQueue?.[0]?.queue_number ?? 0) + 1)
    const sanitizedSymptom = symptomDetail ? sanitize(symptomDetail) : null

  const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
              patient_id: patientId,
              department,
              queue_number: queueNumber,
              booking_date: today,
              status: 'booked',
              symptom_detail: sanitizedSymptom,
      })
      .select()
      .single()

  if (error) {
        return NextResponse.json({ error: '予約の登録に失敗しました' }, { status: 500 })
  }

  if (email && process.env.RESEND_API_KEY) {
        try {
                await fetch('https://api.resend.com/emails', {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
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

export async function PATCH(req: NextRequest) {
    const supabase = getSupabaseAdmin()
    const { id, status } = await req.json()

  if (!id || !status) {
        return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  if (!['cancelled'].includes(status)) {
        return NextResponse.json({ error: '無効なステータスです' }, { status: 400 })
  }

  const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

  if (error || !data) {
        return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ booking: data })
}
