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
import { PlusCircle, ArrowLeft, Check } from 'lucide-react'
import { StableGrid } from '@/components/stable-grid'
import { createHorse, reserveStable } from '@/app/actions/stables'
import type { Horse, StableGridItem } from '@/lib/db'
import { GENDER_META, type GenderType , GENDER_OPTIONS} from '@/lib/horse-types'

type Step = 'horse' | 'stable'

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
  const [isPending, startTransition] = useTransition()

  // New-horse form fields
  const [name, setName] = useState('')
  const [internationalId, setInternationalId] = useState('')
  
  const [gender, setGender] = useState('')
  

  function reset() {
    setStep('horse')
    setMode(horses.length > 0 ? 'existing' : 'new')
    setSelectedHorseId(horses[0]?.id ?? null)
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

    // Create new horse first.
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
    // 1. Prevent booking if the stable is blocked by an admin
    if (!item.is_active) {
      toast.error(`Stable ${item.label} is unavailable for booking.`)
      return
    }

    // 2. Prevent booking if it is already occupied
    if (item.status === 'occupied') {
      toast.error(`Stable ${item.label} is already occupied.`)
      return
    }

    if (!selectedHorseId) return
    
    startTransition(async () => {
      const res = await reserveStable(item.id, selectedHorseId)
      if (!res.ok) {
        toast.error(res.error || 'Reservation failed.')
        return
      }
      toast.success(`Stable ${item.label} reserved.`)
      handleOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="default" />}>
        <PlusCircle className="size-4" aria-hidden />
        Reserve a stable
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'horse' ? 'Step 1 — Horse details' : 'Step 2 — Choose a stable'}
          </DialogTitle>
          <DialogDescription>
            {step === 'horse'
              ? 'Select an existing horse or add a new one to reserve a stable for.'
              : 'Tap an available stable to complete your reservation.'}
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
  // Use gender instead of type
  const meta = h.gender ? GENDER_META[h.gender as GenderType] : null
  const active = selectedHorseId === h.id
  return (
    <button
      key={h.id}
      type="button"
      onClick={() => setSelectedHorseId(h.id)}
      className={`...`}
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
        {active ? <Check className="size-4 text-primary" /> : null}
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
        ) : (
          <div className="flex flex-col gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => setStep('horse')}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back to horse details
            </Button>
            <StableGrid items={stables} onCellClick={handleStableClick} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
