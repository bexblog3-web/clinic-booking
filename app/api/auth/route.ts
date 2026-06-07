import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    const { patientId, birthdate } = await req.json()
    if (!patientId || !birthdate) return NextResponse.json({ error: '入力が不正です' }, { status: 400 })

  const normalizedBirthdate = birthdate.replace(/[-\/]/g, '')

  const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('patients')
      .select('id, name, gender, birthdate, phone, address')
      .eq('id', patientId)
      .eq('birthdate', normalizedBirthdate)
      .single()

  if (error || !data) return NextResponse.json({ error: '患者IDまたは生年月日が正しくありません' }, { status: 401 })
    return NextResponse.json({ patient: data })
}
