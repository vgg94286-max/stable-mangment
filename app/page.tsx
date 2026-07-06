import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { CalendarCheck, LayoutGrid, ShieldCheck } from 'lucide-react'

export default async function Home() {
  const session = await getSession()
  if (session) redirect(session.role === 'admin' ? '/admin' : '/dashboard')

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <Image
            src="/sepf-logo.png"
            alt="Saudi Equestrian and Polo Federation"
            width={56}
            height={56}
            className="h-12 w-auto"
            priority
          />
         
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <span className="mb-4 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-medium text-secondary-foreground">
          Saudi Equestrian &amp; Polo Federation
        </span>
        <h1 className="max-w-3xl text-balance font-serif text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
          Reserve and manage stables across the SEPF facility
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
          Riders register their horses and book from 1,300 stables across 26
          barns. Administrators oversee occupancy and reassign horses in real
          time.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/register">Create rider account</Link>
          </Button>
          
        </div>

        <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
          <Feature
            icon={<CalendarCheck className="size-5" aria-hidden />}
            title="Two-step booking"
            body="Add your horse's details, then pick an available stable in seconds."
          />
          <Feature
            icon={<LayoutGrid className="size-5" aria-hidden />}
            title="1,300 stables"
            body="Browse all 26 barns with fast A-Z navigation and search."
          />
          <Feature
            icon={<ShieldCheck className="size-5" aria-hidden />}
            title="Secure access"
            body="Email-verified accounts with encrypted passwords and sessions."
          />
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-center text-xs text-muted-foreground">
        Saudi Equestrian &amp; Polo Federation — Stable Management Platform
      </footer>
    </div>
  )
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-6 text-center">
      <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-medium text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}
