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

  return NextResponse.json({ calledNumber: nextPatient.queue_number })
}
