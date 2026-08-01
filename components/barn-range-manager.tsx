'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { setBarnVisibleRange } from '@/app/actions/stables'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useDictionary } from '@/context/dictionary-context'

export function BarnRangeManager({ barns }: { barns: string[] }) {
  const { dictionary , lang} = useDictionary()
  const t = dictionary.barnRange

  if (barns.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.empty}</p>
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {barns.map((barn) => (
        <BarnRangeRow key={barn} barn={barn} />
      ))}
    </div>
  )
}

function BarnRangeRow({ barn }: { barn: string }) {
  const [maxNumber, setMaxNumber] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const { dictionary, lang } = useDictionary()
  const t = dictionary.barnRange

  function handleApply() {
    const val = parseInt(maxNumber, 10)

    if (isNaN(val) || val < 1) {
      toast.error(t.errors.invalid)
      return
    }

    if (val > 50) {
      toast.error(t.errors.maximum)
      return
    }

    startTransition(async () => {
      const res = await setBarnVisibleRange(barn, val,lang)
      if (!res.ok) {
        toast.error(res.error || t.errors.update)
        return
      }
      toast.success(t.success.replace('{{barn}}', barn).replace('{{max}}', val.toString()))
      setMaxNumber('')
    })
  }

  const value = parseInt(maxNumber, 10)
  const isValid = !isNaN(value) && value >= 1 && value <= 50

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t.title.replace('{{barn}}', barn)}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            type="number"
            min="1"
            placeholder={t.placeholder}
            value={maxNumber}
            onChange={(e) => setMaxNumber(e.target.value)}
            disabled={isPending}
            className="flex-1"
          />
          <Button onClick={handleApply} disabled={isPending || !isValid}>
            {isPending ? t.saving : t.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}