import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { AuthShell } from '@/components/auth-shell'
import { AdminLoginForm } from '@/components/admin-login-form'
import { Button } from '@/components/ui/button'
import { getDictionary } from '@/dictionaries/get-dictionary'
import { DictionaryProvider } from '@/context/dictionary-context'
import { LanguageSwitcher } from '@/components/language-switcher'

export default async function AdminLoginPage({
  params,
}: {
  params: { lang: string }
}) {
   const resolvedParams = await params
        const lang = resolvedParams.lang 
        const dict = await getDictionary(lang)
        const { adminLogin } = dict.auth
  const session = await getSession()
  if (session?.role === 'admin') redirect(`/${lang}/admin`)

    

  return (
    <DictionaryProvider dictionary={dict} lang={lang}>
    <div className="absolute right-4 top-4">
      <LanguageSwitcher  currentLang={lang} />
    </div>
    
    <AuthShell
      title={adminLogin.title}
      subtitle={adminLogin.subtitle}
      footer={
        <Link href={`/${lang}/login`} className="text-xs text-muted-foreground hover:underline">
         {adminLogin.riderSignIn}
        </Link>
      }
    >
     
      <AdminLoginForm />
       <Button asChild variant="outline" className="mt-4 w-full">
            <Link href={`/${lang}`}>{adminLogin.backHome}</Link>
          </Button>
    </AuthShell>
    </DictionaryProvider>
  )
}
