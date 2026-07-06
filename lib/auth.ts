import 'server-only'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { sql, type User, type UserRole } from './db'

const COOKIE_NAME = 'sepf_session'
const SESSION_DAYS = 7

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not set')
  }
  return new TextEncoder().encode(secret)
}

export type SessionPayload = {
  userId: number
  role: UserRole
  name: string
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret())

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return {
      userId: payload.userId as number,
      role: payload.role as UserRole,
      name: payload.name as string,
    }
  } catch {
    return null
  }
}

// Fetch the full current user record from the database.
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession()
  if (!session) return null
  const rows = (await sql`
    SELECT id, full_name, email, phone, role, email_verified, created_at
    FROM users WHERE id = ${session.userId}
  `) as User[]
  return rows[0] ?? null
}
