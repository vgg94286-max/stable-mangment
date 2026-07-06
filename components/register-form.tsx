'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { registerAction, type ActionState } from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/submit-button'

const initial: ActionState = {}

export function RegisterForm() {
  const router = useRouter()
  const [state, action] = useActionState(registerAction, initial)

  useEffect(() => {
    if (state.error) toast.error(state.error)
    if (state.success && state.email) {
      toast.success(state.success)
      router.push(`/verify?email=${encodeURIComponent(state.email)}`)
    }
  }, [state, router])

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required placeholder="Faisal Al-Otaibi" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+966 5X XXX XXXX" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required placeholder="At least 8 characters" />
      </div>
      <SubmitButton className="mt-2 w-full" pendingText="Creating account...">
        Create account
      </SubmitButton>
    </form>
  )
}
