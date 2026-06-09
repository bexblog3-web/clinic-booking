import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

const DOCTOR_KEYS: Record<string, string> = {
  'key-ortho-secret': 'orthopedics',
  'key-ent-secret': 'ent',
}

function today() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}

export async function POST(req: NextRequest) {
  const authKey = req.headers.get('x-admin-key')
  if (!authKey || !DOCTOR_KEYS[authKey]) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 })
  }

  const department = DOCTOR_KEYS[authKey]
  const supabase = getSupabaseAdmin()
  const t = today()

  // Get next arrived patient (lowest queue number)
  const { data: nextPatient } = await supabase
    .from('bookings')
    .select('id, queue_number, patient_id')
    .eq('department', department)
    .eq('booking_date', t)
    .eq('status', 'arrived')
    .order('queue_number')
    .limit(1)
    .single()

  if (!nextPatient) return NextResponse.json({ error: '待機中の患者がいません' }, { status: 404 })

  // Mark previous calling patient as done
  await supabase
    .from('bookings')
    .update({ status: 'done' })
    .eq('department', department)
    .eq('booking_date', t)
    .eq('status', 'calling')

  // Set next patient to calling
  await supabase
    .from('bookings')
    .update({ status: 'calling' })
    .eq('id', nextPatient.id)

  // Update queue_status current_number
  await supabase
    .from('queue_status')
    .update({ current_number: nextPatient.queue_number, updated_at: new Date().toISOString() })
    .eq('department', department)

  // Send reminder email to patient 5 positions ahead
  const reminderQueueNumber = nextPatient.queue_number + 5
  const { data: reminderPatient } = await supabase
    .from('bookings')
    .select('email, patient_id')
    .eq('department', department)
    .eq('booking_date', t)
    .eq('queue_number', reminderQueueNumber)
    .not('status', 'eq', 'cancelled')
    .single()

  if (reminderPatient?.email && process.env.RESEND_API_KEY) {
    try {
      const deptName = department === 'orthopedics' ? '整形外科' : '耳鼻科'
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'no-reply@yoyaku-mail.com',
          to: reminderPatient.email,
          subject: 'もうすぐお呼びします',
          html: `<p>まもなくお呼びする予定です。診察室へお越しください。</p><p>診療科: ${deptName}</p><p>受付番号: ${String(reminderQueueNumber).padStart(3, '0')}</p><p>現在の混雑状況は<a href="https://clinic-booking-inky.vercel.app/status">こちら</a></p>`,
        }),
      })
    } catch {}
  }

  return NextResponse.json({ calledNumber: nextPatient.queue_number })
}
