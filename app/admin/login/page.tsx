import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { AuthShell } from '@/components/auth-shell'
import { AdminLoginForm } from '@/components/admin-login-form'
import { Button } from '@/components/ui/button'

export default async function AdminLoginPage() {
  const session = await getSession()
  if (session?.role === 'admin') redirect('/admin')

  return (
    <AuthShell
      title="Administrator access"
      subtitle="Restricted area. Sign in with your SEPF administrator credentials."
      footer={
        <Link href="/login" className="text-xs text-muted-foreground hover:underline">
          Rider sign in
        </Link>
      }
    >
     
      <AdminLoginForm />
       <Button asChild variant="outline" className="mt-4 w-full">
            <Link href="/">← Back to Home</Link>
          </Button>
    </AuthShell>
  )
}
