import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// 不在(absent)または完了(done)の患者を待機中(arrived)に戻す。
// 番号が若いままなので、次の「次の患者を呼ぶ」で優先的に呼ばれる。
// 医師（自科のみ）とスタッフ（全科）が使用可能。
export async function POST(req: NextRequest) {
  const authKey = req.headers.get('x-admin-key')
  const staffKey = process.env.ADMIN_KEY_STAFF ?? 'key-staff-secret'
  const DOCTOR_KEYS: Record<string, string> = {
    [process.env.ADMIN_KEY_ORTHO ?? 'key-ortho-secret']: 'orthopedics',
    [process.env.ADMIN_KEY_ENT ?? 'key-ent-secret']: 'ent',
  }
  const isStaff = authKey === staffKey
  const doctorDept = authKey ? DOCTOR_KEYS[authKey] : undefined
  if (!isStaff && !doctorDept) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 })
  }

  const { bookingId } = await req.json()
  if (!bookingId) return NextResponse.json({ error: '予約IDが必要です' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('bookings')
    .update({ status: 'arrived' })
    .eq('id', bookingId)
    .in('status', ['absent', 'done']) // 不在・完了からのみ戻せる
  if (doctorDept) query = query.eq('department', doctorDept) // 医師は自科のみ

  const { data, error } = await query.select().single()

  if (error || !data) return NextResponse.json({ error: '更新に失敗しました（不在・完了の患者のみ戻せます）' }, { status: 400 })
  return NextResponse.json({ booking: data })
}
