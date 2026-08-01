// components/admin-phone-manager.tsx
'use client'

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Phone, Loader2 } from "lucide-react"
import { setAdminPhone } from "@/app/actions/stables"
import { useDictionary } from '@/context/dictionary-context'

export function AdminPhoneManager({ initialPhone }: { initialPhone: string | null }) {
  const [phone, setPhone] = useState(initialPhone || '')
  const [isPending, startTransition] = useTransition()
  const { dictionary , lang} = useDictionary()
  const t = dictionary.adminPhone

  const handleSave = () => {
    startTransition(async () => {
      const res = await setAdminPhone(phone, lang)
      if (res.ok) {
        toast.success(t.success)
      } else {
        toast.error(res.error || t.error)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Phone className="size-4 text-primary" />
          {t.title}
        </CardTitle>
        <CardDescription>
          {t.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
        <Input
          type="tel"
          placeholder={t.placeholder}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="pl-2"
        />
        </div>
        <Button onClick={handleSave}  disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {t.save}
        </Button>
        </div>
      </CardContent>
    </Card>
  )
}