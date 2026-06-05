import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { signPatientToken } from '@/lib/auth'
import { cookies } from 'next/headers'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { patientId, birthdate } = await req.json()
  if (!patientId || !birthdate) return NextResponse.json({ error: '入力が不正です' }, { status: 400 })

  const normalizedBirthdate = birthdate.replace(/[-\/]/g, '')

  const supabase = getSupabaseAdmin()

  // Rate limiting: check recent login attempts
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', patientId)
    .gte('attempted_at', since)
  if ((count ?? 0) >= 10) return NextResponse.json({ error: 'しばらくしてから再試行してください' }, { status: 429 })

  const { data, error } = await supabase
    .from('patients')
    .select('id, name, gender, birthdate, phone, address')
    .eq('id', patientId)
    .eq('birthdate', normalizedBirthdate)
    .single()

  if (error || !data) {
    await supabase.from('login_attempts').insert({ patient_id: patientId, ip_address: ip })
    return NextResponse.json({ error: '患者IDまたは生年月日が正しくありません' }, { status: 401 })
  }

  await supabase.from('login_attempts').delete().eq('patient_id', patientId)

  const token = await signPatientToken(data.id)
  const cookieStore = await cookies()
  cookieStore.set('patient_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  return NextResponse.json({ patient: data })
}
