import Image from 'next/image'
import Link from 'next/link'
import { logoutAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function AppHeader({
  name,
  role,
}: {
  name: string
  role: 'rider' | 'admin'
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href={role === 'admin' ? '/admin' : '/dashboard'} className="flex items-center gap-3">
          <Image
            src="/sepf-logo.png"
            alt="Saudi Equestrian and Polo Federation"
            width={48}
            height={48}
            className="h-11 w-auto"
            priority
          />
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="font-serif text-sm font-semibold text-foreground">
              SEPF Stable Management
            </span>
            <span className="text-xs text-muted-foreground">
              {role === 'admin' ? 'Administrator' : 'Rider portal'}
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {name}
          </span>
          <form action={logoutAction}>
            <Button variant="outline" size="sm" type="submit">
              <LogOut className="size-4" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
