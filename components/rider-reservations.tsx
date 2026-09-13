'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { MapPin, X } from 'lucide-react'
import { cancelReservation } from '@/app/actions/stables'
import type { ReservationDetail } from '@/lib/db'
import { GENDER_META, type GenderType } from '@/lib/horse-types'
import { useDictionary } from '@/context/dictionary-context'


function formatMessage(str: string, vars: Record<string, string | number>) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''))
}

export function RiderReservations({
  reservations,
  dict,
}: {
  reservations: ReservationDetail[]
  dict: any
}) {
  const router = useRouter()
   const { dictionary , lang} = useDictionary()
  const [isPending, startTransition] = useTransition()
  const t = dict.riderReservations

  function handleCancel(id: number, label: string) {
    startTransition(async () => {
      const res = await cancelReservation(id,lang)
      if (!res.ok) {
        toast.error(res.error || t.cancelError)
        return
      }
      toast.success(formatMessage(t.cancelSuccess, { label }))
      router.refresh()
    })
  }

  if (reservations.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 border-dashed p-10 text-center">
        <MapPin className="size-8 text-muted-foreground" aria-hidden />
        <p className="font-medium text-foreground">{t.emptyTitle}</p>
        <p className="text-sm text-muted-foreground">
          {t.emptyDescription}
        </p>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {reservations.map((r) => {
        const meta = r.gender ? GENDER_META[r.gender as GenderType] : null
        return (
          <Card key={r.reservation_id} className="flex items-center justify-between gap-3 p-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                  {r.stable_label.split('-')[0]}
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="font-semibold text-foreground">
                    {t.stable} {r.stable_label}
                  </span>
                  <span className="text-sm text-muted-foreground">{r.horse_name}</span>
                </div>
              </div>
              {meta && (
                <Badge variant="secondary" className="mt-1 w-fit gap-1.5">
                  <span className={`size-2 rounded-full ${meta.dot}`} />
                  {meta.label}
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => handleCancel(r.reservation_id, r.stable_label)}
            >
              <X className="size-4" aria-hidden />
              {t.release}
            </Button>
          </Card>
        )
      })}
    </div>
  )
}