import 'server-only'
import { Resend } from 'resend'
import { sql } from './db'

export type OtpPurpose = 'verify' | 'reset'

const OTP_TTL_MINUTES = 10

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Create (and store) a fresh OTP for an email + purpose, invalidating older ones.
export async function issueOtp(email: string, purpose: OtpPurpose) {
  const code = generateCode()
  await sql`
    UPDATE otp_codes SET consumed = TRUE
    WHERE email = ${email} AND purpose = ${purpose} AND consumed = FALSE
  `
  await sql`
    INSERT INTO otp_codes (email, code, purpose, expires_at)
    VALUES (${email}, ${code}, ${purpose}, now() + (${OTP_TTL_MINUTES} || ' minutes')::interval)
  `
  return code
}

// Verify and consume an OTP. Returns true on success.
export async function consumeOtp(
  email: string,
  code: string,
  purpose: OtpPurpose,
) {
  const rows = (await sql`
    SELECT id FROM otp_codes
    WHERE email = ${email}
      AND code = ${code}
      AND purpose = ${purpose}
      AND consumed = FALSE
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1
  `) as { id: number }[]

  if (rows.length === 0) return false

  await sql`UPDATE otp_codes SET consumed = TRUE WHERE id = ${rows[0].id}`
  return true
}

const SUBJECTS: Record<OtpPurpose, string> = {
  verify: 'Verify your Fanda Stable Management account',
  reset: 'Reset your Fanda Stable Management password',
}

function emailHtml(code: string, purpose: OtpPurpose) {
  const heading =
    purpose === 'verify' ? 'Confirm your email' : 'Reset your password'
  const intro =
    purpose === 'verify'
      ? 'Use the code below to verify your email and activate your account.'
      : 'Use the code below to reset your password.'
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:32px;color:#1a3b34">
    <h1 style="font-size:20px;color:#1f6f5c;margin:0 0 8px">Saudi Equestrian & Polo Federation</h1>
    <h2 style="font-size:16px;margin:0 0 16px">${heading}</h2>
    <p style="font-size:14px;line-height:1.6;color:#44605a">${intro}</p>
    <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1f6f5c;background:#eaf5f1;border-radius:8px;padding:16px;text-align:center;margin:16px 0">${code}</div>
    <p style="font-size:12px;color:#7a908b">This code expires in ${OTP_TTL_MINUTES} minutes. If you did not request this, you can ignore this email.</p>
  </div>`
}

// Send the OTP email via Resend. Falls back to console logging in dev if unconfigured.
export async function sendOtpEmail(
  email: string,
  code: string,
  purpose: OtpPurpose,
) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || 'Fanda <onboarding@resend.dev>'

  

  const resend = new Resend(apiKey)
  try {
    await resend.emails.send({
      from,
      to: email,
      subject: SUBJECTS[purpose],
      html: emailHtml(code, purpose),
    })
    return { delivered: true as const }
  } catch (err) {
    console.log('Resend send failed:', (err as Error).message)
    console.log(`OTP for ${email} (${purpose}): ${code}`)
    return { delivered: false as const, code }
  }
}
