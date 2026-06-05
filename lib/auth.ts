import { SignJWT, jwtVerify } from 'jose'
const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET!)
export async function signPatientToken(patientId: string): Promise<string> {
    return new SignJWT({ patientId }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('8h').sign(getSecret())
}
export async function verifyPatientToken(token: string): Promise<{ patientId: string } | null> {
    try {
          const { payload } = await jwtVerify(token, getSecret())
          return payload as { patientId: string }
    } catch { return null }
}
