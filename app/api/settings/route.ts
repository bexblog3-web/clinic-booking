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
    .from('settings')
    .select('key, value')

  if (error) return NextResponse.json({ error: '設定の取得に失敗しました' }, { status: 500 })
  return NextResponse.json(Object.fromEntries(data.map((r: {key: string, value: string}) => [r.key, r.value])))
}

export async function PUT(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  const staffKey = process.env.ADMIN_KEY_STAFF ?? 'key-staff-secret'
  if (adminKey !== staffKey) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const body = await req.json()
  const supabase = getSupabaseAdmin()

  const upserts = Object.entries(body).map(([key, value]) => ({ key, value: String(value) }))
  const { error } = await supabase.from('settings').upsert(upserts, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: '設定の更新に失敗しました' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
