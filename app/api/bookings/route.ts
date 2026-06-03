import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, phone, date, time, symptom, note } = body
  if (!name || !phone || !date || !time || !symptom)
    return NextResponse.json({ error: '必須項目' }, { status: 400 })
  const { error } = await supabase.from('bookings').insert([{ name, phone, date, time, symptom, note: note || '', status: 'pending' }])
  if (error) return NextResponse.json({ error: 'DBerror' }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const a = req.headers.get('x-admin-key')
  if (a !== process.env.ADMIN_SECRET_KEY)
    return NextResponse.json({ error: '認証エラー' }, { status: 401 })
  const { data, error } = await supabase.from('bookings').select('*').order('date', { ascending: true }).order('time', { ascending: true })
  if (error) return NextResponse.json({ error: 'DBerr' }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const a = req.headers.get('x-admin-key')
  if (a !== process.env.ADMIN_SECRET_KEY)
    return NextResponse.json({ error: '認証エラー' }, { status: 401 })
  const { id, status } = await req.json()
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: 'DBerr' }, { status: 500 })
  return NextResponse.json({ ok: true })
}