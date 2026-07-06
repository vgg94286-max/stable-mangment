'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { adminLoginAction, type ActionState } from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/submit-button'

const initial: ActionState = {}

export function AdminLoginForm() {
  const [state, action] = useActionState(adminLoginAction, initial)

  useEffect(() => {
    if (state.error) toast.error(state.error)
  }, [state])

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Administrator email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="admin@sepf.sa" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <SubmitButton className="mt-2 w-full" pendingText="Signing in...">
        Sign in as administrator
      </SubmitButton>
    </form>
  )
}
