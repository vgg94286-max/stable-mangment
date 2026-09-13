'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  requestResetAction,
  resetPasswordAction,
  type ActionState,
} from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/submit-button'
import { useDictionary } from '@/context/dictionary-context'

const initial: ActionState = {}

export function ResetPasswordForm() {

   const {dictionary, lang} = useDictionary()
      const { common, resetPassword } = dictionary.auth
  const router = useRouter()
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [email, setEmail] = useState('')

  const [requestState, requestFormAction] = useActionState(
    requestResetAction,
    initial,
  )
  const [resetState, resetFormAction] = useActionState(
    resetPasswordAction,
    initial,
  )

  useEffect(() => {
    if (requestState.success) {
      toast.success(requestState.success)
      if (requestState.email) setEmail(requestState.email)
      setStep('reset')
    }
    if (requestState.error) toast.error(requestState.error)
  }, [requestState])

  useEffect(() => {
    if (resetState.success) {
      toast.success(resetState.success)
      router.push(`/${lang}/login`)
    }
    if (resetState.error) toast.error(resetState.error)
  }, [resetState, router])

  if (step === 'request') {
    return (
      <form action={requestFormAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{common.email}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>
        <SubmitButton className="mt-2 w-full" pendingText={resetPassword.submitting}>
          {resetPassword.submit}
        </SubmitButton>
      </form>
    )
  }

  return (
    <form action={resetFormAction} className="flex flex-col gap-4">
      <input type="hidden" name="email" value={email} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="code">Reset code</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          placeholder={resetPassword.codePlaceholder}
          className="text-center text-lg tracking-[0.5em]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="At least 8 characters"
        />
      </div>
      <SubmitButton className="mt-2 w-full" pendingText="Resetting...">
        {resetPassword.submit}
      </SubmitButton>
    </form>
  )
}
