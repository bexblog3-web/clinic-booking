import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyPatientToken } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
export const dynamic = 'force-dynamic'
export async function GET() {
    const cookieStore = await cookies()
    const token = cookieStore.get('patient_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const payload = await verifyPatientToken(token)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const supabase = getSupabaseAdmin()
    const { data } = await supabase.from('patients').select('id, name, gender, birthdate').eq('id', payload.patientId).single()
    return NextResponse.json({ patient: data })
  }
