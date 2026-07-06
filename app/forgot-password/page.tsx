import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { ResetPasswordForm } from '@/components/reset-password-form'

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a code to set a new password."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  )
}
