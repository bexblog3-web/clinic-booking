import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  const staffKey = process.env.ADMIN_KEY_STAFF ?? 'key-staff-secret'
  const orthoKey = process.env.ADMIN_KEY_ORTHO ?? 'key-ortho-secret'
  const entKey = process.env.ADMIN_KEY_ENT ?? 'key-ent-secret'
  if (![staffKey, orthoKey, entKey].includes(adminKey ?? '')) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('departments')
    .select('id, name_ja, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order')

  if (error) return NextResponse.json({ error: '診療科の取得に失敗しました' }, { status: 500 })
  return NextResponse.json(data)
}
