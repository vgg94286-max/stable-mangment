// components/rider-booking-area.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { StableGrid } from '@/components/stable-grid'
import { reserveStable } from '@/app/actions/stables'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { GripVertical } from 'lucide-react'
import type { Horse, StableGridItem } from '@/lib/db'
import { GENDER_META, type GenderType } from '@/lib/horse-types'

export function RiderBookingArea({
  horses,
  stables,
}: {
  horses: Horse[]
  stables: StableGridItem[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // State for the note dialog after a drop
  const [dropContext, setDropContext] = useState<{ stable: StableGridItem; horse: Horse } | null>(null)
  const [note, setNote] = useState('')

  const handleDropHorse = (stableId: number, horseId: number) => {
    const stable = stables.find((s) => s.id === stableId)
    const horse = horses.find((h) => h.id === horseId)
    if (stable && horse) {
      setDropContext({ stable, horse })
      setNote('') // Reset note on new drop
    }
  }

  const confirmBooking = () => {
    if (!dropContext) return
    startTransition(async () => {
      const res = await reserveStable(dropContext.stable.id, dropContext.horse.id, note)
      if (!res.ok) {
        toast.error(res.error || 'Reservation failed.')
      } else {
        toast.success(`${dropContext.horse.name} reserved in ${dropContext.stable.label}.`)
        setDropContext(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="mt-8 flex flex-col gap-6 lg:flex-row">
      {/* Draggable Horses Sidebar */}
      <div className="flex w-full flex-col gap-3 lg:w-1/4 lg:shrink-0">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          Your Horses
        </h2>
        <p className="text-xs text-muted-foreground">
          Drag a horse and drop it onto an available stable to book.
        </p>
        
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card/50 p-3">
          {horses.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No horses found.</p>
          ) : (
            horses.map((horse) => {
              const meta = horse.gender ? GENDER_META[horse.gender as GenderType] : null
              return (
                <div
                  key={horse.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('horseId', horse.id.toString())}
                  className="group flex cursor-grab items-center gap-3 rounded-md border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/50 active:cursor-grabbing"
                >
                  <GripVertical className="size-4 text-muted-foreground opacity-50 group-hover:opacity-100" />
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{horse.name}</span>
                    {meta && (
                      <Badge variant="secondary" className="mt-1 w-fit text-[10px]">
                        {meta.label}
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Droppable Grid */}
      <div className="w-full lg:w-3/4">
        <StableGrid 
          items={stables} 
          isAdmin={false} 
          onDropHorse={handleDropHorse} 
        />
      </div>

      {/* Note / Confirmation Dialog */}
      <Dialog open={!!dropContext} onOpenChange={(open) => !open && setDropContext(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Reservation</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-foreground">
              You are about to reserve stable <strong>{dropContext?.stable.label}</strong> for <strong>{dropContext?.horse.name}</strong>.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Label htmlFor="note">Note for Admin (Optional)</Label>
              <Textarea 
                id="note" 
                placeholder="Anything you'd like us to keep in mind regarding your horse..."
                value={note}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDropContext(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={confirmBooking} disabled={isPending}>
              {isPending ? 'Confirming...' : 'Confirm Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}