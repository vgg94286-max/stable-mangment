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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { PlusCircle, ArrowLeft, Check, GripVertical } from 'lucide-react'
import { StableGrid } from '@/components/stable-grid'
import { createHorse, reserveStable } from '@/app/actions/stables'
import type { Horse, StableGridItem } from '@/lib/db'
import { GENDER_META, type GenderType , GENDER_OPTIONS} from '@/lib/horse-types'

// 1. Added a 'confirm' step to handle the note[cite: 5]
type Step = 'horse' | 'stable' | 'confirm'

export function BookingFlow({
  horses,
  stables,
}: {
  horses: Horse[]
  stables: StableGridItem[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('horse')
  const [mode, setMode] = useState<'existing' | 'new'>(
    horses.length > 0 ? 'existing' : 'new',
  )
  const [selectedHorseId, setSelectedHorseId] = useState<number | null>(
    horses[0]?.id ?? null,
  )
  
  // 2. Added state for the selected stable and note
  const [selectedStable, setSelectedStable] = useState<StableGridItem | null>(null)
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [internationalId, setInternationalId] = useState('')
  const [gender, setGender] = useState('')
  
  function reset() {
    setStep('horse')
    setMode(horses.length > 0 ? 'existing' : 'new')
    setSelectedHorseId(horses[0]?.id ?? null)
    setSelectedStable(null)
    setNote('')
    setName('')
    setInternationalId('')
    setGender('')
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) reset()
  }

  async function goToStableStep() {
    if (mode === 'existing') {
      if (!selectedHorseId) {
        toast.error('Please select a horse.')
        return
      }
      setStep('stable')
      return
    }

    if (!name.trim() || !internationalId.trim() || !gender.trim()) {
      toast.error('Please fill in all fields.')
      return
    }
    startTransition(async () => {
      const res = await createHorse({
        name,
        international_id: internationalId ? parseInt(internationalId, 10) : null,
        gender: gender || null,
        notes: null
      })
      if (!res.ok || !res.horseId) {
        toast.error(res.error || 'Could not save horse.')
        return
      }
      toast.success('Horse saved.')
      setSelectedHorseId(res.horseId)
      router.refresh()
      setStep('stable')
    })
  }

  function handleStableClick(item: StableGridItem) {
    if (!item.is_active) {
      toast.error(`Stable ${item.label} is unavailable for booking.`)
      return
    }
    if (item.status === 'occupied') {
      toast.error(`Stable ${item.label} is already occupied.`)
      return
    }
    if (!selectedHorseId) return
    
    // Instead of booking immediately, go to the confirm step
    setSelectedStable(item)
    setStep('confirm')
  }

  // 3. New drop handler that bridges into the confirm step
  function handleDropHorse(stableId: number, horseId: number) {
    const item = stables.find((s) => s.id === stableId)
    if (!item || !item.is_active || item.status === 'occupied') return
    
    if (horseId !== selectedHorseId) {
      setSelectedHorseId(horseId)
    }
    setSelectedStable(item)
    setStep('confirm')
  }

  function confirmBooking() {
    if (!selectedStable || !selectedHorseId) return
    
    startTransition(async () => {
      // Pass the note to the server action here
      const res = await reserveStable(selectedStable.id, selectedHorseId, note)
      if (!res.ok) {
        toast.error(res.error || 'Reservation failed.')
        return
      }
      toast.success(`Stable ${selectedStable.label} reserved.`)
      handleOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default">
          <PlusCircle className="size-4 mr-2" aria-hidden />
          Reserve a stable
        </Button>
      </DialogTrigger>
      
      {/* Reverted exactly to your original layout constraints[cite: 5] */}
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'horse' && 'Step 1 — Horse details'}
            {step === 'stable' && 'Step 2 — Choose a stable'}
            {step === 'confirm' && 'Step 3 — Confirm reservation'}
          </DialogTitle>
          <DialogDescription>
            {step === 'horse' && 'Select an existing horse or add a new one to reserve a stable for.'}
            {step === 'stable' && 'Tap an available stable or drag your horse to complete your reservation.'}
            {step === 'confirm' && 'Review your reservation and add an optional note.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'horse' ? (
          <div className="flex flex-col gap-4">
            {horses.length > 0 ? (
              <div className="flex gap-2">
                <Button
                  variant={mode === 'existing' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('existing')}
                >
                  My horses
                </Button>
                <Button
                  variant={mode === 'new' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('new')}
                >
                  Add new horse
                </Button>
              </div>
            ) : null}

            {mode === 'existing' && horses.length > 0 ? (
              <div className="flex flex-col gap-2">
                {horses.map((h) => {
                  const meta = h.gender ? GENDER_META[h.gender as GenderType] : null
                  const active = selectedHorseId === h.id
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setSelectedHorseId(h.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted aria-selected:border-primary aria-selected:bg-primary/5"
                      aria-selected={active}
                    >
                      <div className="flex flex-1 items-center gap-3">
                        <div className="flex items-center gap-2">
                          {meta ? (
                            <Badge variant="secondary" className="gap-1.5">
                              <span className={`size-2 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </Badge>
                          ) : null}
                          <div className="flex flex-col gap-1 leading-tight">
                            <span className="font-medium text-foreground">{h.name}</span>
                          </div>
                          {active ? <Check className="ml-2 size-4 text-primary" /> : null}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="h-name">Horse name *</Label>
                  <Input id="h-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Najm" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="h-intl">International ID *</Label>
                  <Input
                    id="h-intl"
                    type="number"
                    value={internationalId}
                    onChange={(e) => setInternationalId(e.target.value)}
                    placeholder="123456789"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="h-gender">Type*</Label>
                  <Select value={gender} onValueChange={(v) => setGender(v ?? '')}>
                    <SelectTrigger id="h-gender">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((g) => (
                        <SelectItem key={g.value} value={g.value}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={goToStableStep} disabled={isPending}>
                {isPending ? 'Saving...' : 'Continue to stable selection'}
              </Button>
            </div>
          </div>
        ) : step === 'stable' ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => setStep('horse')}
              >
                <ArrowLeft className="size-4 mr-2" aria-hidden />
                Back to horse details
              </Button>
              
              {/* 4. Compact Drag Indicator taking up no vertical space */}
              {selectedHorseId && (
                <div
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('horseId', selectedHorseId.toString())}
                  className="flex cursor-grab items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary active:cursor-grabbing"
                >
                  <GripVertical className="size-3" />
                  Drag horse to a stable
                </div>
              )}
            </div>
            
            <StableGrid 
              items={stables} 
              onCellClick={handleStableClick} 
              onDropHorse={handleDropHorse}
              isAdmin={false} 
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => setStep('stable')}
            >
              <ArrowLeft className="size-4 mr-2" aria-hidden />
              Back to stable selection
            </Button>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-foreground">
                Reserving stable <strong className="text-primary">{selectedStable?.label}</strong>.
              </p>
              
              <div className="mt-4 flex flex-col gap-2">
                <Label htmlFor="note">Note for Admin (Optional)</Label>
                <Textarea 
                  id="note" 
                  placeholder="Anything specific we should know?"
                  value={note}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={confirmBooking} disabled={isPending}>
                {isPending ? 'Confirming...' : 'Confirm Reservation'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}