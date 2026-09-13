import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { AuthShell } from '@/components/auth-shell'
import { RegisterForm } from '@/components/register-form'
import { Button } from '@/components/ui/button'
import { getDictionary } from '@/dictionaries/get-dictionary'
import { DictionaryProvider } from '@/context/dictionary-context'

export default async function RegisterPage({
  params,
}: {
  params: { lang: string }
}) {
  const session = await getSession()
  if (session) redirect(session.role === 'admin' ? '/admin' : '/dashboard')

    const resolvedParams = await params
      const lang = resolvedParams.lang 
      const dict = await getDictionary(lang)
      const { register } = dict.auth

  
  return (
     <DictionaryProvider dictionary={dict} lang={lang}>
    <AuthShell
    params={params}
      title={register.title}
      subtitle={register.subtitle}
      footer={
        <>
           
          <Link href={`/${lang}/login`} className="font-medium text-primary hover:underline">
            {register.footerLink}
          </Link>

          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href={`/${lang}`}>{register.backHome}</Link>
          </Button>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
    </DictionaryProvider>
  )
}
