import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// 呼び出し中(calling)の患者を不在(absent)にする。医師専用。
export async function POST(req: NextRequest) {
  const authKey = req.headers.get('x-admin-key')
  const DOCTOR_KEYS: Record<string, string> = {
    [process.env.ADMIN_KEY_ORTHO ?? 'key-ortho-secret']: 'orthopedics',
    [process.env.ADMIN_KEY_ENT ?? 'key-ent-secret']: 'ent',
  }
  if (!authKey || !DOCTOR_KEYS[authKey]) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 })
  }
  const department = DOCTOR_KEYS[authKey]

  const { bookingId } = await req.json()
  if (!bookingId) return NextResponse.json({ error: '予約IDが必要です' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'absent' })
    .eq('id', bookingId)
    .eq('department', department) // 自分の科の患者のみ操作可能
    .eq('status', 'calling')      // 呼び出し中の患者のみ不在にできる
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: '更新に失敗しました（呼び出し中の患者のみ不在にできます）' }, { status: 400 })
  return NextResponse.json({ booking: data })
}
