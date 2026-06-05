import { NextRequest, NextResponse } from 'next/server'

const CREDENTIALS: Record<string, string> = {
    staff: process.env.ADMIN_PW_STAFF ?? 'staff1234',
    ortho: process.env.ADMIN_PW_ORTHO ?? 'ortho1234',
    ent: process.env.ADMIN_PW_ENT ?? 'ent1234',
}

const KEYS: Record<string, string> = {
    staff: process.env.ADMIN_KEY_STAFF ?? 'key-staff-secret',
    ortho: process.env.ADMIN_KEY_ORTHO ?? 'key-ortho-secret',
    ent: process.env.ADMIN_KEY_ENT ?? 'key-ent-secret',
}

export async function POST(req: NextRequest) {
    const { role, password } = await req.json()
    if (!role || !password) return NextResponse.json({ error: 'invalid input' }, { status: 400 })
    if (CREDENTIALS[role] !== password) return NextResponse.json({ error: 'invalid password' }, { status: 401 })
    return NextResponse.json({ key: KEYS[role] })
}
