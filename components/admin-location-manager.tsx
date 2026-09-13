'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { setFacilityLocation } from '@/app/actions/stables'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MapPin, Loader2 } from 'lucide-react'
import { useDictionary } from '@/context/dictionary-context'

export function AdminLocationManager({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl || '')
  const [isPending, startTransition] = useTransition()
  const { dictionary,lang } = useDictionary()
  const t = dictionary.adminLocation

  function handleSave() {
    if (!url.trim()) {
      toast.error(t.errors.empty)
      return
    }

    try {
      new URL(url.trim());
    } catch (_) {
      toast.error(t.errors.invalid)
      return
    }

    startTransition(async () => {
      const res = await setFacilityLocation(url.trim(),lang)
      if (res.ok) {
        toast.success(t.success)
      } else {
        toast.error(res.error || t.errors.save)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>
          {t.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-[30%] size-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder={t.placeholder} 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSave} disabled={isPending || url === initialUrl}>
            {isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            {t.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}