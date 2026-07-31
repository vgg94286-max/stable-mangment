'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  verifyEmailAction,
  resendVerificationAction,
  type ActionState,
} from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/submit-button'
import { useParams } from 'next/navigation';
import { useDictionary } from '@/context/dictionary-context'


const initial: ActionState = {}

export function VerifyForm({ email }: { email: string }) {
   const  { dictionary, lang } = useDictionary()
    const { common, verify } = dictionary.auth
  const [state, action] = useActionState(verifyEmailAction, initial)
  const [resendState, resendAction] = useActionState(
    resendVerificationAction,
    initial,
  )
  const params = useParams()
  const lango = params.lang  

  useEffect(() => {
    if (state.error) toast.error(state.error)
  }, [state])

  useEffect(() => {
    if (resendState.success) toast.success(resendState.success)
    if (resendState.error) toast.error(resendState.error)
  }, [resendState])

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="email" value={email} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">{lango}</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            placeholder={verify.codePlaceholder}
            className="text-center text-lg tracking-[0.5em]"
          />
        </div>
        <SubmitButton className="w-full" pendingText={verify.submitting}>
          {verify.submit}
        </SubmitButton>
      </form>
      <form action={resendAction}>
        <input type="hidden" name="email" value={email} />
        <SubmitButton variant="ghost" className="w-full" pendingText={verify.resending}>
          {verify.resend}
        </SubmitButton>
      </form>
    </div>
  )
}
