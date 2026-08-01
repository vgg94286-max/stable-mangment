import Image from 'next/image'
import Link from 'next/link'
import { logoutAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { LanguageSwitcher } from '@/components/language-switcher'

export async function AppHeader({
  params,
  name,
  role,
}: {
  params: { lang: string }
  name: string
  role: 'rider' | 'admin'
}) {
  const resolvedParams = await params
  const lang = resolvedParams.lang 
  
  // Note: Ensure your logoutAction uses .bind(null, lang) 
  // if you implemented the localized redirect fix earlier!
 

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Left Side: Logo & App Name */}
        <Link href={role === 'admin' ? `/${lang}/admin` : `/${lang}/dashboard`} className="flex items-center gap-2 sm:gap-3">
          <Image
            src="/sepf-logo.png"
            alt="Saudi Equestrian and Polo Federation"
            width={48}
            height={48}
            className="h-10 w-auto sm:h-11"
            priority
          />
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="font-serif text-sm font-semibold text-foreground">
              Fanda Stable Management
            </span>
            <span className="text-xs text-muted-foreground">
              {role === 'admin' ? 'Administrator' : 'Rider portal'}
            </span>
          </div>
        </Link>
        
        {/* Right Side: Switcher, User Name & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher currentLang={lang} />
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {name}
          </span>
          <form action={logoutAction}>
            <Button variant="outline" size="sm" type="submit" className="px-2 sm:px-3">
              <LogOut className="size-4 sm:mr-2" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}