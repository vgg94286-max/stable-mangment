'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { loginAction, type ActionState } from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/submit-button'

const initial: ActionState = {}

export function LoginForm() {
  const router = useRouter()
  const [state, action] = useActionState(loginAction, initial)

  useEffect(() => {
    if (state.error) {
      toast.error(state.error)
      if (state.email && state.error.toLowerCase().includes('verify')) {
        router.push(`/verify?email=${encodeURIComponent(state.email)}`)
      }
    }
  }, [state, router])

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
         
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required placeholder="Your password" />
         <a href="/forgot-password" className="text-xs text-primary hover:underline">
            Forgot password?
          </a>
      </div>
      <SubmitButton className="mt-2 w-full" pendingText="Signing in...">
        Sign in
      </SubmitButton>
    </form>
  )
}
