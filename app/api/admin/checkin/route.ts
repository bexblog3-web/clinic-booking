import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const authKey = req.headers.get('x-admin-key')
  if (authKey !== 'key-staff-secret') {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 })
  }

  const { bookingId } = await req.json()
  if (!bookingId) return NextResponse.json({ error: '予約IDが必要です' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'arrived' })
    .eq('id', bookingId)
    .eq('status', 'booked')
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: '更新に失敗しました' }, { status: 400 })
  return NextResponse.json({ booking: data })
}
