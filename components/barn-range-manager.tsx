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

export function BarnRangeManager({ barns }: { barns: string[] }) {
  if (barns.length === 0) {
    return <p className="text-sm text-muted-foreground">No barns found.</p>
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

  function handleApply() {
    const val = parseInt(maxNumber, 10)
    if (isNaN(val) || val < 1) {
      toast.error('Please enter a valid number greater than 0.')
      return
    }

    startTransition(async () => {
      const res = await setBarnVisibleRange(barn, val)
      if (!res.ok) {
        toast.error(res.error || 'Failed to update barn range.')
        return
      }
      toast.success(`Barn ${barn} updated. Stables 1-${val} are now active.`)
      setMaxNumber('') // Clear input on success
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Barn {barn}</CardTitle>
        <CardDescription>Limit visible stables for riders.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            type="number"
            min="1"
            placeholder="Max stable number"
            value={maxNumber}
            onChange={(e) => setMaxNumber(e.target.value)}
            disabled={isPending}
            className="flex-1"
          />
          <Button onClick={handleApply} disabled={isPending || !maxNumber}>
            {isPending ? 'Saving...' : 'Apply'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}