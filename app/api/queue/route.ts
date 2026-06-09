export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

function today() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}

export async function GET() {
  const supabase = getSupabaseAdmin()
  const t = today()
  const depts = ['ent', 'orthopedics']
  const result: Record<string, {
    current: number
    next: number | null
    all_numbers: { queue_number: number; status: string }[]
  }> = {}
  for (const dept of depts) {
    // Derive current from today's calling/done bookings (resets naturally each day)
    const { data: currentRow } = await supabase
      .from('bookings').select('queue_number').eq('department', dept).eq('booking_date', t)
      .in('status', ['calling', 'done']).order('queue_number', { ascending: false }).limit(1).single()
    const { data: nextRow } = await supabase
      .from('bookings').select('queue_number').eq('department', dept).eq('booking_date', t).eq('status', 'arrived').order('queue_number').limit(1).single()
    const { data: allRows } = await supabase
      .from('bookings').select('queue_number, status').eq('department', dept).eq('booking_date', t).neq('status', 'cancelled').order('queue_number')
    result[dept] = {
      current: currentRow?.queue_number ?? 0,
      next: nextRow?.queue_number ?? null,
      all_numbers: allRows ?? []
    }
  }
  return NextResponse.json(result)
}
