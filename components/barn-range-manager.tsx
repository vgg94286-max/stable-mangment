'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { setBarnVisibleRange, toggleBarnsActive } from '@/app/actions/stables'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useDictionary } from '@/context/dictionary-context'

// A barn is considered "off" here when every non-occupied stable inside it has
// been blocked (see toggleBarnsActive) — i.e. there's nothing left available
// for a rider to book. That mirrors exactly what the old standalone "Bulk
// Barn" dialog did, just applied to a single barn instead of a multi-select.
export type BarnSummaryRow = {
  barn: string
  total: number
  occupied: number
  available: number
  blocked: number
}

export function BarnRangeManager({ barns }: { barns: BarnSummaryRow[] }) {
  const { dictionary } = useDictionary()
  const t = dictionary.barnRange

  if (barns.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.empty}</p>
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {barns.map((row) => (
        <BarnRangeRow key={row.barn} row={row} />
      ))}
    </div>
  )
}

function BarnRangeRow({ row }: { row: BarnSummaryRow }) {
  const { barn } = row
  const router = useRouter()
  const [maxNumber, setMaxNumber] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const [isToggling, startToggleTransition] = useTransition()

  // Optimistic local copy of the on/off state, seeded from the server summary
  // and reconciled by router.refresh() after each toggle.
  const [isActive, setIsActive] = useState(row.blocked === 0)

  const { dictionary, lang } = useDictionary()
  const t = dictionary.barnRange
  const tGrid = dictionary.adminGrid

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
      const res = await setBarnVisibleRange(barn, val, lang)
      if (!res.ok) {
        toast.error(res.error || t.errors.update)
        return
      }
      toast.success(t.success.replace('{{barn}}', barn).replace('{{max}}', val.toString()))
      setMaxNumber('')
    })
  }

  function handleToggle() {
    const next = !isActive
    startToggleTransition(async () => {
      const res = await toggleBarnsActive([barn], next, lang)
      if (!res.ok) {
        toast.error(res.error || tGrid.bulk.error)
        return
      }
      setIsActive(next)
      toast.success(next ? tGrid.bulk.successUnblock : tGrid.bulk.successBlock)
      router.refresh()
    })
  }

  const value = parseInt(maxNumber, 10)
  const isValid = !isNaN(value) && value >= 1 && value <= 50

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg">{t.title.replace('{{barn}}', barn)}</CardTitle>
            <CardDescription className="mt-1">{t.description}</CardDescription>
          </div>

          {/* Per-barn on/off toggle — replaces the old standalone "Bulk Barn"
              dialog, wired to the same toggleBarnsActive action. */}
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            aria-label={isActive ? tGrid.dialog.block : tGrid.dialog.unblock}
            disabled={isToggling}
            onClick={handleToggle}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-300 ease-in-out',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-60',
              isActive ? 'border-primary bg-primary' : 'border-border bg-muted',
            )}
          >
            <span
              className={cn(
                'inline-block size-4 transform rounded-full bg-white shadow transition-transform duration-300 ease-in-out',
                isActive ? 'translate-x-[22px]' : 'translate-x-1',
              )}
            />
          </button>
        </div>
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