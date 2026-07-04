import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { signPatientToken } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    const { patientId, birthdate } = await req.json()
    if (!patientId || !birthdate) return NextResponse.json({ error: '入力が不正です' }, { status: 400 })

  const normalizedBirthdate = birthdate.replace(/[-\/]/g, '')

  const supabase = getSupabaseAdmin()
    // #7: 認証時はログイン照合に必要な最小限のみ取得（住所・電話・生年月日・性別は返さない）
    const { data, error } = await supabase
      .from('patients')
      .select('id, name')
      .eq('id', patientId)
      .eq('birthdate', normalizedBirthdate)
      .single()

  if (error || !data) return NextResponse.json({ error: '患者IDまたは生年月日が正しくありません' }, { status: 401 })

  // #4: 本人確認用トークンを発行し、httpOnly Cookieで保持する。
  // 以降の予約作成・キャンセル・照会はこのトークンで本人性を検証する。
  const token = await signPatientToken(String(data.id))
  const res = NextResponse.json({ patient: data })
  res.cookies.set('patient_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8時間（トークンの有効期限と揃える）
  })
  return res
}
