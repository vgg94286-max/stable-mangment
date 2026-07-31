'use client'

import { useState, useTransition , useMemo} from 'react'
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
import { ArrowLeftRight, X ,Ban, CheckCircle ,Layers} from 'lucide-react'

import { StableGrid } from '@/components/stable-grid'
import { cancelReservation, moveReservation,toggleStableActive,toggleBarnsActive,swapReservations } from '@/app/actions/stables'
import type { StableGridItem } from '@/lib/db'
import { GENDER_META, type GenderType } from '@/lib/horse-types'

export function AdminGridManager({ stables }: { stables: StableGridItem[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<StableGridItem | null>(null)
  const [moving, setMoving] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [selectedBarns, setSelectedBarns] = useState<string[]>([])

  const uniqueBarns = useMemo(() => {
    return Array.from(new Set(stables.map((s) => s.barn))).sort()
  }, [stables])

  function handleToggleActive() {
    if (!selected) return

    if (selected.is_active && selected.status === 'occupied') {
      toast.error('You cannot block an occupied stable. Release it first.')
      return
    }
    const newState = !selected.is_active
    startTransition(async () => {
      const res = await toggleStableActive(selected.id, newState)
      if (!res.ok) {
        toast.error(res.error || 'Update failed.')
        return
      }
      toast.success(`Stable ${selected.label} is now ${newState ? 'available' : 'blocked'}.`)
      setSelected({ ...selected, is_active: newState }) // Optimistic UI update
      router.refresh()
    })
  }
  function handleBulkToggle(isActive: boolean) {
    if (selectedBarns.length === 0) return
    startTransition(async () => {
      const res = await toggleBarnsActive(selectedBarns, isActive)
      if (!res.ok) {
        toast.error(res.error || 'Bulk update failed.')
        return
      }
      toast.success(`Selected barns successfully ${isActive ? 'unblocked' : 'blocked'}.`)
      setIsBulkOpen(false)
      setSelectedBarns([])
      router.refresh()
    })
  }

  function toggleBarnSelection(barn: string) {
    setSelectedBarns((prev) =>
      prev.includes(barn) ? prev.filter((b) => b !== barn) : [...prev, barn]
    )
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
            item.id
          )
          if (!res.ok) {
            toast.error(res.error || 'Swap failed.')
            return
          }
          toast.success(`Swapped ${selected.horse_name} with ${item.horse_name}.`)
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
          const res = await moveReservation(selected.reservation_id!, item.id)
          if (!res.ok) {
            toast.error(res.error || 'Move failed.')
            return
          }
          toast.success(`Moved ${selected.horse_name} to ${item.label}.`)
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
      const res = await cancelReservation(selected.reservation_id!)
      if (!res.ok) {
        toast.error(res.error || 'Could not release.')
        return
      }
      toast.success(`Stable ${selected.label} released.`)
      setSelected(null)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-xs font-medium text-muted-foreground">Type:</span>
          {(Object.keys(GENDER_META) as GenderType[]).map((g) => (
            <span key={g} className="flex items-center gap-1.5 text-xs text-foreground">
              <span className={`size-3 rounded-full ${GENDER_META[g].dot}`} />
              {GENDER_META[g].label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs text-foreground">
            <span className="size-3 rounded-full border border-border bg-card" />
            Available
          </span>
        </div>
        
        {/* Bulk Action Button */}
        <Button variant="outline" size="sm" onClick={() => setIsBulkOpen(true)}>
          <Layers className="mr-2 size-4" /> Bulk Manage Barns
        </Button>
      </div>

      {moving && selected ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary bg-primary/5 p-3">
          <p className="text-sm text-foreground">
            Select an available stable to move <strong>{selected.horse_name}</strong>, or select an occupied stable to swap.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMoving(false)
              setSelected(null)
            }}
          >
            Cancel move/swap
          </Button>
        </div>
      ) : null}

      <StableGrid
        items={stables}
        onCellClick={handleCellClick}
        selectedStableId={moving ? selected?.id : null}
        isAdmin={true}
      />

      <Dialog
        open={!!selected && !moving}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Stable {selected?.label}</DialogTitle>
            <DialogDescription>
              {selected?.status === 'occupied' 
                ? 'Manage this reservation.' 
                : 'Manage this stable.'}
            </DialogDescription>
          </DialogHeader>
          
          {selected ? (
            <div className="flex flex-col gap-4">
              
              {/* ONLY show horse details and Move/Release buttons if occupied */}
              {selected.status === 'occupied' && (
                <>
                  <div className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Horse</span>
                      <span className="font-medium text-foreground">
                        {selected.horse_name}
                      </span>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Type</span>
                      {selected.gender ? (
                        <Badge variant="secondary" className="gap-1.5">
                          <span className={`size-2 rounded-full ${GENDER_META[selected.gender as GenderType].dot}`} />
                          {GENDER_META[selected.gender as GenderType].label}
                        </Badge>
                      ) : null}
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Rider</span>
                      <span className="font-medium text-foreground">
                        {selected.rider_name}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={isPending}
                      onClick={() => setMoving(true)}
                    >
                      <ArrowLeftRight className="size-4" aria-hidden />
                      Move horse
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={isPending}
                      onClick={handleCancel}
                    >
                      <X className="size-4" aria-hidden />
                      Release stable
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
                      <Ban className="size-4 mr-2" aria-hidden /> Block Stable
                    </>
                  ) : (
                    <>
                      <CheckCircle className="size-4 mr-2" aria-hidden /> Unblock Stable
                    </>
                  )}
                </Button>
              </div>

            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Manage Barns</DialogTitle>
            <DialogDescription>
              Select multiple barns to block or unblock at once. Occupied stables will not be blocked.
            </DialogDescription>
          </DialogHeader>

          <div className="flex max-h-[300px] flex-col gap-2 overflow-y-auto rounded-md border p-3">
            {uniqueBarns.map((barn) => (
              <label
                key={barn}
                className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  className="size-4 rounded border-gray-300 accent-primary"
                  checked={selectedBarns.includes(barn)}
                  onChange={() => toggleBarnSelection(barn)}
                />
                <span className="text-sm font-medium">Barn {barn}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={isPending || selectedBarns.length === 0}
              onClick={() => handleBulkToggle(false)}
            >
              <Ban className="size-4 mr-2" aria-hidden /> Block Selected
            </Button>
            <Button
              variant="default"
              className="flex-1"
              disabled={isPending || selectedBarns.length === 0}
              onClick={() => handleBulkToggle(true)}
            >
              <CheckCircle className="size-4 mr-2" aria-hidden /> Unblock Selected
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
