import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function signPatientToken(patientId: string) {
  return new SignJWT({ patientId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(SECRET)
}

export async function verifyPatientToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { patientId: string }
  } catch {
    return null
  }
}
