import Link from 'next/link'
import {Button} from '@/components/ui/button'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { AuthShell } from '@/components/auth-shell'
import { LoginForm } from '@/components/login-form'
import { getDictionary } from '@/dictionaries/get-dictionary'
import { DictionaryProvider } from '@/context/dictionary-context'


export default async function LoginPage({
  params,
}: {
  params: { lang: string }
}) {
 const resolvedParams = await params
  const lang = resolvedParams.lang 
  const dict = await getDictionary(lang)
  const { login } = dict.auth
  const session = await getSession()
  if (session) redirect(session.role === 'admin' ? `/${lang}/admin` : `/${lang}/dashboard`)
  
 
  
  return (
    <DictionaryProvider dictionary={dict} lang={lang}>

  
    <AuthShell
      params={params}
      lang={lang} 
      title={login.title}
      subtitle={login.subtitle}
      footer={
        <>
          <div>
            {login.footer}
            <Link href={`/${lang}/register`} className="font-medium text-primary hover:underline">
              {login.footerLink}
            </Link>
          </div>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href={`/${lang}`}>{login.backHome}</Link>
          </Button>
          
        </>
      }
    >
      <LoginForm />
    </AuthShell>
      </DictionaryProvider>
  )
}
