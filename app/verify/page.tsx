import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/auth-shell'
import { VerifyForm } from '@/components/verify-form'

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams
  if (!email) redirect('/register')

  return (
    <AuthShell
      title="Verify your email"
      subtitle={`We sent a 6-digit code to ${email}. Enter it below to activate your account.`}
    >
      <VerifyForm email={email} />
    </AuthShell>
  )
}
