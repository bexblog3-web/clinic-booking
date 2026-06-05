import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { Resend } from 'resend'

const DEPT_LABEL: Record<string, string> = { ent: '耳鼻科', orthopedics: '整形外科' }

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

  // 患者名を取得
  const { data: patient } = await supabase
    .from('patients')
    .select('name')
    .eq('id', patientId)
    .single()

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert([{ patient_id: patientId, department, queue_number: nextNum, symptom_since: symptomSince, symptom_detail: symptomDetail, email, status: 'booked', booking_date: t }])
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // メール送信
  if (email && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const patientName = patient?.name || '患者'
      const deptLabel = DEPT_LABEL[department] || department
      const queueNum = String(nextNum).padStart(3, '0')
      const statusUrl = `https://clinic-booking-inky.vercel.app/status`

      await resend.emails.send({
        from: 'はまもと整形外科クリニック <onboarding@resend.dev>',
        to: email,
        subject: `【受付完了】${deptLabel} 受付番号 ${queueNum} 番`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #16a34a;">受付が完了しました</h2>
            <p>${patientName} 様</p>
            <p>以下の内容で受付が完了しました。</p>
            <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px; background: #f0fdf4; font-weight: bold; width: 40%;">診療科</td>
                <td style="padding: 8px; background: #f0fdf4;">${deptLabel}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">受付番号</td>
                <td style="padding: 8px; font-size: 24px; font-weight: bold; color: #16a34a;">${queueNum} 番</td>
              </tr>
              <tr>
                <td style="padding: 8px; background: #f0fdf4; font-weight: bold;">受付日</td>
                <td style="padding: 8px; background: #f0fdf4;">${t}</td>
              </tr>
            </table>
            <p>受付番号が近くなったら来院ください。</p>
            <a href="${statusUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">混雑状況を確認する</a>
            <p style="margin-top: 24px; color: #9ca3af; font-size: 12px;">はまもと整形外科クリニック</p>
          </div>
        `,
      })
    } catch (emailError) {
      // メール送信失敗しても予約は成功として返す
      console.error('Email send error:', emailError)
    }
  }

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
