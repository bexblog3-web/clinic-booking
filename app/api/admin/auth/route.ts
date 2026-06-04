import { NextRequest, NextResponse } from 'next/server'

// Simple role-based auth with hardcoded passwords for prototype
const CREDENTIALS: Record<string, string> = {
  staff: 'staff1234',
  ortho: 'ortho1234',
  ent: 'ent1234',
}

const KEYS: Record<string, string> = {
  staff: 'key-staff-secret',
  ortho: 'key-ortho-secret',
  ent: 'key-ent-secret',
}

export async function POST(req: NextRequest) {
  const { role, password } = await req.json()
  if (!role || !password) return NextResponse.json({ error: '入力が不正です' }, { status: 400 })
  if (CREDENTIALS[role] !== password) return NextResponse.json({ error: 'パスワードが正しくありません' }, { status: 401 })
  return NextResponse.json({ key: KEYS[role] })
}
