import Link from 'next/link'
import {Button} from '@/components/ui/button'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { AuthShell } from '@/components/auth-shell'
import { LoginForm } from '@/components/login-form'

export default async function LoginPage() {
  const session = await getSession()
  if (session) redirect(session.role === 'admin' ? '/admin' : '/dashboard')

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your horses and stable reservations."
      footer={
        <>
          <div>
            New rider?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </div>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href="/">← Back to Home</Link>
          </Button>
          
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  )
}
