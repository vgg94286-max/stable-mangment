import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/language-switcher'

import { getDictionary } from '@/dictionaries/get-dictionary'

export default async function Home({ params }: { params: { lang: 'en' | 'ar' } }) {
  const session = await getSession()
  if (session) redirect(session.role === 'admin' ? '/admin' : '/dashboard')
  const resolvedParams = await params
  const lang = resolvedParams.lang 
  const dict = await getDictionary(lang)
  return (
    <div className="flex min-h-svh flex-col ">
       
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <Image
            src="/sepf-logo.png"
            alt="Fanda"
            width={56}
            height={56}
            className="h-18 w-auto"
            priority
          />
         
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher currentLang={lang} />
          <Button variant="ghost" asChild>
            
            <Link href={`/${lang}/login`}>{dict.home.signIn}</Link>
          </Button>
          <Button asChild>
            <Link href={`/${lang}/register`}>{dict.home.getStarted}</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <span className="mb-4 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-medium text-secondary-foreground">
          <bdi>{dict.home.badge}</bdi>
        </span>
        <h1 className="max-w-3xl text-balance font-serif text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
          {dict.home.title}
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
          {dict.home.description}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href={`/${lang}/register`}>{dict.home.createAccount}</Link>
          </Button>
        </div>

        <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
          <Feature
            icon={<img src="/cal.jpg" alt="Calendar" className="rounded-lg h-12 w-12"/>}
            title={dict.home.features.bookingTitle}
            body={dict.home.features.bookingDesc}
          />
          <Feature
            icon={<img src="/horse.jpg" alt="Horse" className="rounded-lg h-12 w-12" />}
            title={dict.home.features.stablesTitle}
            body={dict.home.features.stablesDesc}
          />
          <Feature
            icon={<img src="/prot.jpg" alt="Protection"  className="rounded-lg h-12 w-12" />}
            title={dict.home.features.securityTitle}
            body={dict.home.features.securityDesc}
          />
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-center text-xs text-muted-foreground">
        {dict.home.footer}
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
      <div className="flex size-11 items-center justify-center rounded-lg  text-primary">
        {icon}
      </div>
      <h3 className="font-medium text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}
