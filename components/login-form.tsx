'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { loginAction, type ActionState } from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/submit-button'
import { useDictionary } from '@/context/dictionary-context'

const initial: ActionState = {}

export function LoginForm() {
  const router = useRouter()
  const  { dictionary, lang } = useDictionary()
  const { common, login } = dictionary.auth
  const [state, action] = useActionState(loginAction, initial)

  useEffect(() => {
    if (state.error) {
      toast.error(state.error)
      if (state.email && state.error.toLowerCase().includes('verify')) {
        router.push(`/${lang}/verify?email=${encodeURIComponent(state.email)}`)
      }
    }
  }, [state, router])

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="lang" value={lang} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{common.email}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder={login.emailPlaceholder} />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{common.password}</Label>
         
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required placeholder={login.passwordPlaceholder} />
         <a href={`/${lang}/forgot-password`} className="text-xs text-primary hover:underline">
            {common.forgotPassword}
          </a>
      </div>
      <SubmitButton className="mt-2 w-full" pendingText="Signing in...">
        {login.submit}
      </SubmitButton>
    </form>
  )
}
