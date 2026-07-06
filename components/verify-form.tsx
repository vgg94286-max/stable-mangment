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

const initial: ActionState = {}

export function VerifyForm({ email }: { email: string }) {
  const [state, action] = useActionState(verifyEmailAction, initial)
  const [resendState, resendAction] = useActionState(
    resendVerificationAction,
    initial,
  )

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
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            placeholder="6-digit code"
            className="text-center text-lg tracking-[0.5em]"
          />
        </div>
        <SubmitButton className="w-full" pendingText="Verifying...">
          Verify email
        </SubmitButton>
      </form>
      <form action={resendAction}>
        <input type="hidden" name="email" value={email} />
        <SubmitButton variant="ghost" className="w-full" pendingText="Sending...">
          Resend code
        </SubmitButton>
      </form>
    </div>
  )
}
