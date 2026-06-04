import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

function today() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  const validKeys = [process.env.ADMIN_ORTHO_KEY, process.env.ADMIN_ENT_KEY, process.env.ADMIN_STAFF_KEY]
  if (!validKeys.includes(adminKey || '')) return NextResponse.json({ error: '認証エラー' }, { status: 401 })

  const { department } = await req.json()
  const supabase = getSupabaseAdmin()
  const t = today()

  // 現在の診察中を完了に
  await supabase.from('bookings').update({ status: 'done' }).eq('department', department).eq('booking_date', t).eq('status', 'in_progress')

  // 次の来院済み患者を取得
  const { data: next } = await supabase
    .from('bookings')
    .select('id, queue_number')
    .eq('department', department)
    .eq('booking_date', t)
    .eq('status', 'arrived')
    .order('queue_number')
    .limit(1)
    .single()

  if (!next) return NextResponse.json({ message: '呼べる患者がいません' })

  // 診察中に変更
  await supabase.from('bookings').update({ status: 'in_progress' }).eq('id', next.id)
  // queue_statusを更新
  await supabase.from('queue_status').upsert({ department, current_number: next.queue_number, date: t, updated_at: new Date().toISOString() })

  return NextResponse.json({ calledNumber: next.queue_number })
}