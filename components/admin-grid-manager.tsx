'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeftRight, X, Ban, CheckCircle } from 'lucide-react'

import { StableGrid } from '@/components/stable-grid'
import { cancelReservation, moveReservation, toggleStableActive, swapReservations } from '@/app/actions/stables'
import type { StableGridItem } from '@/lib/db'
import { GENDER_META, type GenderType } from '@/lib/horse-types'
import { useDictionary } from '@/context/dictionary-context'

export function AdminGridManager({ stables }: { stables: StableGridItem[] }) {
  const router = useRouter()
  const { dictionary , lang} = useDictionary()
  const t = dictionary.adminGrid

  const [selected, setSelected] = useState<StableGridItem | null>(null)
  const [moving, setMoving] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleToggleActive() {
    if (!selected) return

    if (selected.is_active && selected.status === 'occupied') {
      toast.error(t.toast.cannotBlock)
      return
    }
    const newState = !selected.is_active
    startTransition(async () => {
      const res = await toggleStableActive(selected.id, newState, lang)
      if (!res.ok) {
        toast.error(res.error || t.toast.updateFailed)
        return
      }
      toast.success(newState ? t.toast.stableAvailable.replace('{{label}}', selected.label) : t.toast.stableBlocked.replace('{{label}}', selected.label))
      setSelected({ ...selected, is_active: newState }) // Optimistic UI update
      router.refresh()
    })
  }

  function handleCellClick(item: StableGridItem) {
    if (moving && selected) {
      // Prevent moving/swapping to the exact same stable
      if (item.id === selected.id) {
        setMoving(false)
        setSelected(null)
        return
      }

      // Handle SWAPPING if the target stable is occupied
      if (item.status === 'occupied') {
        if (!selected.reservation_id || !item.reservation_id) return
        startTransition(async () => {
          const res = await swapReservations(
            selected.reservation_id!,
            selected.id,
            item.reservation_id!,
            item.id,
            lang
          )
          if (!res.ok) {
            toast.error(res.error || t.toast.swapFailed)
            return
          }
          toast.success(t.toast.swapped.replace('{{horse1}}', selected.horse_name!).replace('{{horse2}}', item.horse_name!))
          setMoving(false)
          setSelected(null)
          router.refresh()
        })
        return
      }

      // Handle MOVING if the target stable is available
      if (item.status === 'available') {
        if (!selected.reservation_id) return
        startTransition(async () => {
          const res = await moveReservation(selected.reservation_id!, item.id,lang)
          if (!res.ok) {
            toast.error(res.error || t.toast.moveFailed)
            return
          }
          toast.success(t.toast.moved.replace('{{horse}}', selected.horse_name!).replace('{{stable}}', item.label))
          setMoving(false)
          setSelected(null)
          router.refresh()
        })
        return
      }
    }

    // Standard click to open dialog
    setSelected(item)
  }

  function handleCancel() {
    if (!selected?.reservation_id) return
    startTransition(async () => {
      const res = await cancelReservation(selected.reservation_id!,lang)
      if (!res.ok) {
        toast.error(res.error || t.toast.releaseFailed)
        return
      }
      toast.success(t.toast.released.replace('{{label}}', selected.label))
      setSelected(null)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card p-3">
        <span className="text-xs font-medium text-muted-foreground">{t.legend.type}:</span>
        {(Object.keys(GENDER_META) as GenderType[]).map((g) => (
          <span key={g} className="flex items-center gap-1.5 text-xs text-foreground">
            <span className={`size-3 rounded-full ${GENDER_META[g].dot}`} />
            {GENDER_META[g].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-foreground">
          <span className="size-3 rounded-full border border-border bg-card" />
          {t.legend.available}
        </span>
      </div>

      {moving && selected ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary bg-primary/5 p-3">
          <p className="text-sm text-foreground">
            {t.moveMode.description.split('{{horse}}')[0]}
            <strong>{selected.horse_name}</strong>
            {t.moveMode.description.split('{{horse}}')[1]}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMoving(false)
              setSelected(null)
            }}
          >
            {t.moveMode.cancel}
          </Button>
        </div>
      ) : null}

      <StableGrid
        items={stables}
        onCellClick={handleCellClick}
        selectedStableId={moving ? selected?.id : null}
        isAdmin={true}
         dict={dictionary}
      />

      <Dialog
        open={!!selected && !moving}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dialog.title.replace('{{label}}', selected?.label || '')}</DialogTitle>
            <DialogDescription>
              {selected?.status === 'occupied' 
                ? t.dialog.occupiedDescription 
                : t.dialog.availableDescription}
            </DialogDescription>
          </DialogHeader>
          
          {selected ? (
            <div className="flex flex-col gap-4">
              
              {/* ONLY show horse details and Move/Release buttons if occupied */}
              {selected.status === 'occupied' && (
                <>
                  <div className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t.dialog.horse}</span>
                      <span className="font-medium text-foreground">
                        {selected.horse_name}
                      </span>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t.dialog.type}</span>
                      {selected.gender ? (
                        <Badge variant="secondary" className="gap-1.5">
                          <span className={`size-2 rounded-full ${GENDER_META[selected.gender as GenderType].dot}`} />
                          {GENDER_META[selected.gender as GenderType].label}
                        </Badge>
                      ) : null}
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t.dialog.rider}</span>
                      <span className="font-medium text-foreground">
                        {selected.rider_name}
                      </span>
                    </div>

                    {selected.note ? (
                      <div className="mt-2 border-t border-border pt-2">
                        <span className="text-sm text-muted-foreground">
                          {t.dialog.note ?? 'Note'}
                        </span>
                        <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-sm text-foreground">
                          {selected.note}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={isPending}
                      onClick={() => setMoving(true)}
                    >
                      <ArrowLeftRight className="size-4" aria-hidden />
                      {t.dialog.moveHorse}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={isPending}
                      onClick={handleCancel}
                    >
                      <X className="size-4" aria-hidden />
                      {t.dialog.releaseStable}
                    </Button>
                  </div>
                </>
              )}

              {/* ALWAYS show the Block/Unblock button */}
              <div className="mt-2 flex gap-2 border-t border-border pt-4">
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={
                    isPending || 
                    (selected.is_active && selected.status === 'occupied')
                  }
                  onClick={handleToggleActive}
                >
                  {selected.is_active ? (
                    <>
                      <Ban className="size-4 mr-2" aria-hidden /> {t.dialog.block}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="size-4 mr-2" aria-hidden /> {t.dialog.unblock}
                    </>
                  )}
                </Button>
              </div>

            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}