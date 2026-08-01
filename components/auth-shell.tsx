import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { LanguageSwitcher } from '@/components/language-switcher'
import { getDictionary } from '@/dictionaries/get-dictionary'

export async function AuthShell({
  params,
  title,
  subtitle,
  children,
  footer,
  lang = 'en'
}: {
  params: { lang: string }
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  lang?: string
}) {
  const resolvedParams = await params
  const lango = resolvedParams.lang 
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href={`/${lango}`} className="mb-4">
            <Image
              src="/sepf-logo.png"
              alt="Saudi Equestrian and Polo Federation"
              width={140}
              height={140}
              priority
              className="h-24 w-auto"
            />
          </Link>
          <h1 className="text-balance font-serif text-2xl font-semibold text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {children}
        </div>
        {footer ? (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </div>
    </main>
  )
}
