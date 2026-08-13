import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { DM_Sans, Fraunces } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'
import { getDictionary } from '@/dictionaries/get-dictionary' 
import { DictionaryProvider } from '@/context/dictionary-context'
import { ThemeProvider } from '@/components/theme-provider' // Added import

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
})

export const metadata: Metadata = {
  title: 'Fanda Stable Management | Fanda',
  description:
    'Reserve, manage, and track horse stables across 26 barns with the Saudi Equestrian and Polo Federation stable management platform.',
  icons: {
    icon: '/sepf-logo.png',
    shortcut: '/sepf-logo.png',
    apple: '/sepf-logo.png',
  },
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: { lang: string }
}>) {
  const resolvedParams = await params
  const lang = resolvedParams.lang 
  const dict = await getDictionary(lang)
  const isArabic = lang === 'ar'
  
  return (
    <html 
      lang={lang} 
      dir={isArabic ? 'rtl' : 'ltr'} 
      suppressHydrationWarning // Added to prevent next-themes hydration warnings
      className={`${dmSans.variable} ${fraunces.variable}`}
    >
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <DictionaryProvider dictionary={dict} lang={lang}>
            {children}
          </DictionaryProvider>
          <Toaster position="top-center" richColors />
        </ThemeProvider>
        
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}  params: { lang: string }
}>) {
  const resolvedParams = await params
  const lang = resolvedParams.lang 
  const dict = await getDictionary(lang)
  const isArabic = lang === 'ar'
  return (
    <html lang={lang} dir={isArabic ? 'rtl' : 'ltr'} className={`${dmSans.variable} ${fraunces.variable}  `}>
      <body className="font-sans antialiased bg-background text-foreground">
        <DictionaryProvider dictionary={dict} lang={lang}>
          {children}
        </DictionaryProvider>
        <Toaster position="top-center" richColors />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
