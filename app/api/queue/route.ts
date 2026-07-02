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
    // 「診察中」は実際に呼び出し中(calling)の番号を最優先で表示する。
    // calling が無い時だけ done の最大番号にフォールバック（診察の合間の表示継続用）。
    // 旧実装は calling/done の最大番号だったため、遅れて来院した若い番号を呼ぶと表示がズレた。
    const { data: callingRow } = await supabase
      .from('bookings').select('queue_number').eq('department', dept).eq('booking_date', t)
      .eq('status', 'calling').limit(1).single()
    let currentRow = callingRow
    if (!currentRow) {
      const { data: doneRow } = await supabase
        .from('bookings').select('queue_number').eq('department', dept).eq('booking_date', t)
        .eq('status', 'done').order('queue_number', { ascending: false }).limit(1).single()
      currentRow = doneRow
    }
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
