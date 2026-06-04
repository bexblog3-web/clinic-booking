import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

function today() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}

export async function GET() {
  const supabase = getSupabaseAdmin()
  const t = today()
  const { data: qs } = await supabase.from('queue_status').select('*')
  const depts = ['ent', 'orthopedics']
  const result: Record<string, { current: number; next: number | null }> = {}
  for (const dept of depts) {
    const status = qs?.find(q => q.department === dept)
    const { data: nextRow } = await supabase
      .from('bookings').select('queue_number').eq('department', dept).eq('booking_date', t).eq('status', 'arrived').order('queue_number').limit(1).single()
    result[dept] = { current: status?.current_number ?? 0, next: nextRow?.queue_number ?? null }
  }
  return NextResponse.json(result)
}