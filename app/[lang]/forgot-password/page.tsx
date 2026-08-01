import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { ResetPasswordForm } from '@/components/reset-password-form'
import { getDictionary } from '@/dictionaries/get-dictionary'
import { DictionaryProvider } from '@/context/dictionary-context'

export default async function ForgotPasswordPage({
  params,
}: {
  params: { lang: string }
}) {
  const resolvedParams = await params
    const lang = resolvedParams.lang 
    const dict = await getDictionary(lang)
    const { forgotPassword } = dict.auth
  return (
    <DictionaryProvider dictionary={dict} lang={lang}>
    <AuthShell
    params={params}
      title={forgotPassword.title}
      subtitle={forgotPassword.subtitle}
      footer={
        <Link href={`/${lang}/login`} className="font-medium text-primary hover:underline">
          {forgotPassword.backHome}
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
    </DictionaryProvider>

  )
}
