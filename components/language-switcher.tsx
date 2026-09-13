"use client" // This must be at the top because we are reading the browser's URL

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function LanguageSwitcher({ currentLang }: { currentLang: string }) {
  const pathname = usePathname()
  

  const targetLang = currentLang === 'en' ? 'ar' : 'en'
  const buttonText = currentLang === 'en' ? 'العربية' : 'English'

  
  const newPath = pathname.replace(`/${currentLang}`, `/${targetLang}`)

  return (
    <Button className="bg-secondary" asChild>
      <Link href={newPath}>{buttonText}</Link>
    </Button>
  )
}