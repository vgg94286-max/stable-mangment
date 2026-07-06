'use server'

import { redirect } from 'next/navigation'
import { sql, type User } from '@/lib/db'
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getSession,
} from '@/lib/auth'
import { issueOtp, consumeOtp, sendOtpEmail } from '@/lib/otp'

export type ActionState = { error?: string; success?: string; email?: string }

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function validPassword(pw: string) {
  return pw.length >= 8
}

// --- Registration ---------------------------------------------------------

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fullName = String(formData.get('fullName') || '').trim()
  const email = normalizeEmail(String(formData.get('email') || ''))
  const phone = String(formData.get('phone') || '').trim()
  const password = String(formData.get('password') || '')

  if (!fullName || !email || !password) {
    return { error: 'Please fill in all required fields.' }
  }
  if (!validPassword(password)) {
    return { error: 'Password must be at least 8 characters.' }
  }

  const existing = (await sql`SELECT id, email_verified FROM users WHERE email = ${email}`) as {
    id: number
    email_verified: boolean
  }[]

  if (existing.length > 0 && existing[0].email_verified) {
    return { error: 'An account with this email already exists.' }
  }

  const passwordHash = await hashPassword(password)

  if (existing.length > 0) {
    // Unverified account: update details and re-send OTP.
    await sql`
      UPDATE users SET full_name = ${fullName}, phone = ${phone || null}, password_hash = ${passwordHash}
      WHERE email = ${email}
    `
  } else {
    await sql`
      INSERT INTO users (full_name, email, phone, password_hash, role, email_verified)
      VALUES (${fullName}, ${email}, ${phone || null}, ${passwordHash}, 'rider', FALSE)
    `
  }

  const code = await issueOtp(email, 'verify')
  await sendOtpEmail(email, code, 'verify')

  return { success: 'Account created. Check your email for a verification code.', email }
}

// --- Email verification ----------------------------------------------------

export async function verifyEmailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = normalizeEmail(String(formData.get('email') || ''))
  const code = String(formData.get('code') || '').trim()

  if (!email || !code) {
    return { error: 'Enter the verification code.', email }
  }

  const ok = await consumeOtp(email, code, 'verify')
  if (!ok) {
    return { error: 'Invalid or expired code.', email }
  }

  const rows = (await sql`
    UPDATE users SET email_verified = TRUE WHERE email = ${email}
    RETURNING id, full_name, role
  `) as { id: number; full_name: string; role: 'rider' | 'admin' }[]

  if (rows.length === 0) {
    return { error: 'Account not found.', email }
  }

  const user = rows[0]
  await createSession({ userId: user.id, role: user.role, name: user.full_name })
  redirect('/dashboard')
}

export async function resendVerificationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = normalizeEmail(String(formData.get('email') || ''))
  if (!email) return { error: 'Email is required.' }
  const code = await issueOtp(email, 'verify')
  await sendOtpEmail(email, code, 'verify')
  return { success: 'A new code has been sent.', email }
}

// --- Login -----------------------------------------------------------------

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = normalizeEmail(String(formData.get('email') || ''))
  const password = String(formData.get('password') || '')

  if (!email || !password) {
    return { error: 'Enter your email and password.' }
  }

  const rows = (await sql`
    SELECT id, full_name, password_hash, role, email_verified
    FROM users WHERE email = ${email}
  `) as (Pick<User, 'id' | 'full_name' | 'role' | 'email_verified'> & {
    password_hash: string
  })[]

  if (rows.length === 0) {
    return { error: 'Invalid email or password.' }
  }

  const user = rows[0]
  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return { error: 'Invalid email or password.' }
  }

  if (!user.email_verified) {
    const code = await issueOtp(email, 'verify')
    await sendOtpEmail(email, code, 'verify')
    return {
      error: 'Please verify your email first. We sent you a new code.',
      email,
    }
  }

  await createSession({ userId: user.id, role: user.role, name: user.full_name })
  redirect(user.role === 'admin' ? '/admin' : '/dashboard')
}

export async function adminLoginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = normalizeEmail(String(formData.get('email') || ''))
  const password = String(formData.get('password') || '')

  const rows = (await sql`
    SELECT id, full_name, password_hash, role FROM users WHERE email = ${email}
  `) as (Pick<User, 'id' | 'full_name' | 'role'> & { password_hash: string })[]

  if (rows.length === 0 || rows[0].role !== 'admin') {
    return { error: 'Invalid administrator credentials.' }
  }
  const valid = await verifyPassword(password, rows[0].password_hash)
  if (!valid) {
    return { error: 'Invalid administrator credentials.' }
  }

  await createSession({ userId: rows[0].id, role: 'admin', name: rows[0].full_name })
  redirect('/admin')
}

// --- Password reset --------------------------------------------------------

export async function requestResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = normalizeEmail(String(formData.get('email') || ''))
  if (!email) return { error: 'Enter your email.' }

  const rows = (await sql`SELECT id FROM users WHERE email = ${email}`) as {
    id: number
  }[]

  // Always report success to avoid leaking which emails exist.
  if (rows.length > 0) {
    const code = await issueOtp(email, 'reset')
    await sendOtpEmail(email, code, 'reset')
  }

  return {
    success: 'If an account exists, a reset code has been sent.',
    email,
  }
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = normalizeEmail(String(formData.get('email') || ''))
  const code = String(formData.get('code') || '').trim()
  const password = String(formData.get('password') || '')

  if (!email || !code || !password) {
    return { error: 'All fields are required.', email }
  }
  if (!validPassword(password)) {
    return { error: 'Password must be at least 8 characters.', email }
  }

  const ok = await consumeOtp(email, code, 'reset')
  if (!ok) {
    return { error: 'Invalid or expired code.', email }
  }

  const passwordHash = await hashPassword(password)
  await sql`UPDATE users SET password_hash = ${passwordHash} WHERE email = ${email}`

  return { success: 'Password reset. You can now sign in.', email }
}

// --- Logout ----------------------------------------------------------------

export async function logoutAction() {
  await destroySession()
  redirect('/')
}

export async function requireRider() {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

export async function requireAdmin() {
  const session = await getSession()
  if (!session) redirect('/admin/login')
  if (session.role !== 'admin') redirect('/dashboard')
  return session
}
