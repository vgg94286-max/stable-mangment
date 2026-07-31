// components/admin-phone-manager.tsx
'use client'

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Phone, Loader2 } from "lucide-react"
import { setAdminPhone } from "@/app/actions/stables"

export function AdminPhoneManager({ initialPhone }: { initialPhone: string | null }) {
  const [phone, setPhone] = useState(initialPhone || '')
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const res = await setAdminPhone(phone)
      if (res.ok) {
        toast.success("Admin phone number updated successfully.")
      } else {
        toast.error(res.error || "Failed to update phone number.")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Phone className="size-4 text-primary" />
          Administration Contact Phone Number
        </CardTitle>
        <CardDescription>
          This phone number will be displayed on the rider dashboard for direct contact.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="tel"
          placeholder="+966 5X XXX XXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="sm:max-w-xs"
        />
        <Button onClick={handleSave}  disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Save Number
        </Button>
      </CardContent>
    </Card>
  )
}