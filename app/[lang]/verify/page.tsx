import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/auth-shell'
import { VerifyForm } from '@/components/verify-form'
import { getDictionary } from '@/dictionaries/get-dictionary'
import { DictionaryProvider } from '@/context/dictionary-context'

export default async function VerifyPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{ email?: string }>
  params: { lang: string }
}) {
  const resolvedParams = await params
          const lang = resolvedParams.lang 
          const dict = await getDictionary(lang)
          const { verify } = dict.auth
  const { email } = await searchParams
  if (!email) redirect(`/${lang}/register`)

    
  return (

    <DictionaryProvider dictionary={dict} lang={lang}>
    <AuthShell
    params={params}
      title={verify.title}
      subtitle={`${verify.subtitle} ${email}`}
    >
      <VerifyForm email={email} />
    </AuthShell>
    </DictionaryProvider>
  )
}
