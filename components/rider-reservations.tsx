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

export function RiderReservations({
  reservations,
}: {
  reservations: ReservationDetail[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleCancel(id: number, label: string) {
    startTransition(async () => {
      const res = await cancelReservation(id)
      if (!res.ok) {
        toast.error(res.error || 'Could not cancel.')
        return
      }
      toast.success(`Reservation for ${label} cancelled.`)
      router.refresh()
    })
  }

  if (reservations.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 border-dashed p-10 text-center">
        <MapPin className="size-8 text-muted-foreground" aria-hidden />
        <p className="font-medium text-foreground">No active reservations</p>
        <p className="text-sm text-muted-foreground">
          Reserve a stable to see it listed here.
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
                    Stable {r.stable_label}
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
              Release
            </Button>
          </Card>
        )
      })}
    </div>
  )
}
