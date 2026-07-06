import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { AuthShell } from '@/components/auth-shell'
import { RegisterForm } from '@/components/register-form'
import { Button } from '@/components/ui/button'

export default async function RegisterPage() {
  const session = await getSession()
  if (session) redirect(session.role === 'admin' ? '/admin' : '/dashboard')

  return (
    <AuthShell
      title="Create your rider account"
      subtitle="Register to manage your horses and reserve stables at the SEPF facility."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>

          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href="/">← Back to Home</Link>
          </Button>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  )
}
