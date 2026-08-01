'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
import { GENDER_META, type GenderType, GENDER_OPTIONS } from '@/lib/horse-types'
import { cn } from '@/lib/utils'
import { useDictionary } from '@/context/dictionary-context'

type Step = 'horse' | 'stable' | 'confirm'

export function BookingFlow({
  horses,
  stables,
}: {
  horses: Horse[]
  stables: StableGridItem[]
}) {
  const router = useRouter()
  const { dictionary,lang  } = useDictionary()
  const t = dictionary.bookingFlow

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('horse')
  const [selectedHorseId, setSelectedHorseId] = useState<number | null>(
    horses[0]?.id ?? null,
  )
  
  const [selectedStable, setSelectedStable] = useState<StableGridItem | null>(null)
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [internationalId, setInternationalId] = useState('')
  const [gender, setGender] = useState('')

  const [isDragging, setIsDragging] = useState(false)
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 })
  const hoveredCellRef = useRef<HTMLElement | null>(null)

  const selectedHorse = horses.find(h => h.id === selectedHorseId)
  const gridScrollRef = useRef<HTMLDivElement | null>(null)

  function reset() {
    setStep('horse')
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
    if (selectedHorseId) {
      setStep('stable')
      return
    }

    if (!name.trim() || !internationalId.trim() || !gender.trim()) {
      toast.error(t.horse.validation)
      return
    }

    startTransition(async () => {
      const res = await createHorse({
        name,
        international_id: internationalId ? parseInt(internationalId, 10) : null,
        gender: gender || null,
        notes: null,
        lang:lang
      })
      if (!res.ok || !res.horseId) {
        toast.error(res.error || t.horse.saveError)
        return
      }
      toast.success(t.horse.saveSuccess)
      setSelectedHorseId(res.horseId)
      router.refresh()
      setStep('stable')
    })
  }

  function handleStableClick(item: StableGridItem) {
    if (!item.is_active) {
      toast.error(t.stable.unavailable.replace('{{label}}', item.label))
      return
    }
    if (item.status === 'occupied') {
      toast.error(t.stable.occupied.replace('{{label}}', item.label))
      return
    }
    if (!selectedHorseId) return
    
    setSelectedStable(item)
    setStep('confirm')
  }

  function handleDropHorse(stableId: number) {
    if (!selectedHorseId) return
    const item = stables.find((s) => s.id === stableId)
    
    if (!item || !item.is_active || item.status === 'occupied') return
    
    setSelectedStable(item)
    setStep('confirm')
  }

  function handlePointerDownOnHorse(e: React.PointerEvent<HTMLDivElement>) {
    if (!selectedHorse) return
    // Prevent this from also being treated as a text-selection or a click-drag on the card.
    e.preventDefault()
    setGhostPos({ x: e.clientX, y: e.clientY })
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    function clearHover() {
      hoveredCellRef.current?.classList.remove('ring-2', 'ring-primary', 'ring-offset-1')
      hoveredCellRef.current = null
    }

    // Auto-scroll: found once from a stable marker rather than "whatever's under the
    // cursor". elementFromPoint-based lookups break asymmetrically here — the grid is
    // the last element in the dialog, so once the cursor drifts past its bottom edge to
    // trigger auto-scroll, elementFromPoint returns the dialog backdrop (outside the
    // grid's DOM subtree) instead of anything inside it, and no scrollable ancestor is
    // ever found. Referencing the container directly and comparing rects avoids that.
    let scrollSpeed = 0
    let rafId: number | null = null
    
    function scrollLoop() {
      const container = gridScrollRef.current
  if (container && scrollSpeed !== 0) {
    container.scrollTop += scrollSpeed
  }
  rafId = requestAnimationFrame(scrollLoop)
    }
    rafId = requestAnimationFrame(scrollLoop)

    function onMove(e: PointerEvent) {
  setGhostPos({ x: e.clientX, y: e.clientY })

  const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
  const cellEl = el?.closest<HTMLElement>('[data-stable-id]') ?? null

  if (hoveredCellRef.current && hoveredCellRef.current !== cellEl) {
    clearHover()
  }
  if (cellEl && !(cellEl as HTMLButtonElement).disabled) {
    cellEl.classList.add('ring-2', 'ring-primary', 'ring-offset-1')
    hoveredCellRef.current = cellEl
  }

  const container = gridScrollRef.current
  if (!container) {
    scrollSpeed = 0
    return
  }

  const rect = container.getBoundingClientRect()

  // The grid's real bottom edge can sit below the dialog's own visible area
  // (DialogContent scrolls independently), so the pointer may never be able
  // to get near rect.bottom. Clamp to the dialog's visible bounds so the
  // trigger zone is always reachable.
  const dialogEl = container.closest<HTMLElement>('[role="dialog"]')
  const dialogRect = dialogEl?.getBoundingClientRect()
  const boundsTop = dialogRect ? Math.max(rect.top, dialogRect.top) : rect.top
  const boundsBottom = dialogRect ? Math.min(rect.bottom, dialogRect.bottom) : rect.bottom

  const threshold = 60
  const distToTop = e.clientY - boundsTop
  const distToBottom = boundsBottom - e.clientY
  const withinX = e.clientX > rect.left - 40 && e.clientX < rect.right + 40

  if (withinX && distToTop < threshold) {
    scrollSpeed = -(8 + Math.min(1, Math.max(0, 1 - distToTop / threshold)) * 16)
  } else if (withinX && distToBottom < threshold) {
    scrollSpeed = 8 + Math.min(1, Math.max(0, 1 - distToBottom / threshold)) * 16
  } else {
    scrollSpeed = 0
  }
}

    function onUp(e: PointerEvent) {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      const cellEl = el?.closest<HTMLElement>('[data-stable-id]') ?? null
      clearHover()

      if (cellEl && !(cellEl as HTMLButtonElement).disabled) {
        const id = Number(cellEl.dataset.stableId)
        if (!Number.isNaN(id)) handleDropHorse(id)
      }
      setIsDragging(false)
    }

    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)

    return () => {
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      if (rafId !== null) cancelAnimationFrame(rafId)
      clearHover()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging])

  function confirmBooking() {
    if (!selectedStable || !selectedHorseId) return
    
    startTransition(async () => {
      const res = await reserveStable(selectedStable.id, selectedHorseId,lang, note)
      if (!res.ok) {
        toast.error(res.error || t.confirm.reservationError)
        return
      }
      toast.success(t.confirm.reservationSuccess.replace('{{label}}', selectedStable.label))
      handleOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default">
          <PlusCircle className="mr-2 size-4" aria-hidden />
          {t.button}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-4xl p-5 sm:p-6">
        <DialogHeader className="mb-1">
          <DialogTitle>
            {step === 'horse' && t.steps.horseTitle}
            {step === 'stable' && t.steps.stableTitle}
            {step === 'confirm' && t.steps.confirmTitle}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {step === 'horse' && t.steps.horseDescription}
            {step === 'stable' && t.steps.stableDescription}
            {step === 'confirm' && t.steps.confirmDescription}
          </DialogDescription>
        </DialogHeader>

        {step === 'horse' ? (
          <div className="flex flex-col gap-3 py-1 sm:gap-4">
            <div className="max-h-[50vh] overflow-y-auto pr-1 flex flex-col gap-4">
              {horses.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t.horse.existing}
                  </Label>
                  <div className="flex flex-col gap-2">
                    {horses.map((h) => {
                      const meta = h.gender ? GENDER_META[h.gender as GenderType] : null
                      const active = selectedHorseId === h.id
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            setSelectedHorseId(h.id)
                            setName('')
                            setInternationalId('')
                            setGender('')
                          }}
                          className={cn(
                            'flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/50 text-left',
                            active && 'border-primary bg-primary/5 ring-1 ring-primary',
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {meta ? (
                              <Badge variant="secondary" className="gap-1.5 px-1.5 py-0">
                                <span className={`size-1.5 rounded-full ${meta.dot}`} />
                                <span className="text-[10px]">{meta.label}</span>
                              </Badge>
                            ) : null}
                            <span className="text-sm font-medium text-foreground">{h.name}</span>
                          </div>
                          {active ? <Check className="size-4 text-primary" /> : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {horses.length > 0 ? (
                <div className="relative flex items-center justify-center my-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <span className="relative bg-background px-2 text-xs uppercase text-muted-foreground font-medium">
                    {t.horse.orAdd}
                  </span>
                </div>
              ) : (
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.horse.addNew}
                </Label>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-border p-3 sm:p-4 bg-card">
                <div className="col-span-1 sm:col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="h-name" className="text-xs sm:text-sm">{t.horse.name} *</Label>
                  <Input 
                    id="h-name" 
                    className="h-9" 
                    value={name} 
                    onChange={(e) => {
                      setName(e.target.value)
                      if (e.target.value) setSelectedHorseId(null)
                    }} 
                    placeholder={t.horse.namePlaceholder} 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="h-intl" className="text-xs sm:text-sm">{t.horse.internationalId} *</Label>
                  <Input
                    id="h-intl"
                    type="number"
                    className="h-9"
                    value={internationalId}
                    onChange={(e) => {
                      setInternationalId(e.target.value)
                      if (e.target.value) setSelectedHorseId(null)
                    }}
                    placeholder={t.horse.internationalIdPlaceholder}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="h-gender" className="text-xs sm:text-sm">{t.horse.type} *</Label>
                  <Select 
                    value={gender} 
                    onValueChange={(v) => {
                      setGender(v ?? '')
                      if (v) setSelectedHorseId(null)
                    }}
                  >
                    <SelectTrigger id="h-gender" className="h-9">
                      <SelectValue placeholder={t.horse.typePlaceholder} />
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
            </div>

            <div className="flex justify-end pt-1">
              <Button onClick={goToStableStep} disabled={isPending} className="w-full sm:w-auto h-9">
                {isPending ? t.horse.saving : t.horse.continue}
              </Button>
            </div>
          </div>
        ) : step === 'stable' ? (
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="self-start -ml-2 text-muted-foreground h-8"
                onClick={() => setStep('horse')}
              >
                <ArrowLeft className="mr-2 size-4" aria-hidden />
                {t.stable.back}
              </Button>
            </div>
            
            {selectedHorse && (
              <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {t.stable.selectedHorse}
                </span>
                <div
                  onPointerDown={handlePointerDownOnHorse}
                  style={{ touchAction: 'none' }}
                  className={cn(
                    'flex cursor-grab select-none items-center gap-2 rounded-md border border-border bg-card p-2 shadow-sm transition-colors hover:border-primary active:cursor-grabbing',
                    isDragging && 'opacity-50',
                  )}
                >
                  <GripVertical className="size-4 text-muted-foreground/50" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">{selectedHorse.name}</span>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="hidden text-[11px] text-muted-foreground sm:inline-block">
                      {t.stable.dragHint}
                    </span>
                    <ArrowLeft className="size-3 -rotate-90 text-muted-foreground sm:hidden" />
                  </div>
                </div>
              </div>
            )}
            
            <div className="h-px w-full bg-border" />
            
            <StableGrid 
              items={stables} 
              onCellClick={handleStableClick} 
              onDropHorse={handleDropHorse}
              isAdmin={false} 
              dict={dictionary}
               scrollContainerRef={gridScrollRef}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2 sm:gap-6">
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:gap-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                 <div>
                    <p className="text-xs text-muted-foreground">{t.confirm.horse}</p>
                    <p className="text-sm font-medium text-foreground">{selectedHorse?.name}</p>
                 </div>
                 <div className="hidden h-8 w-px bg-border sm:block"></div>
                 <div>
                    <p className="text-xs text-muted-foreground">{t.confirm.stable}</p>
                    <p className="text-sm font-medium text-foreground">{selectedStable?.label}</p>
                 </div>
                 <div className="hidden h-8 w-px bg-border sm:block"></div>
                 <div>
                    <p className="text-xs text-muted-foreground">{t.confirm.barn}</p>
                    <p className="text-sm font-medium text-foreground">{selectedStable?.barn}</p>
                 </div>
              </div>
              
              <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3 sm:mt-4 sm:gap-3 sm:pt-4">
                <Label htmlFor="note" className="text-xs sm:text-sm">{t.confirm.note}</Label>
                <Textarea 
                  id="note" 
                  placeholder={t.confirm.notePlaceholder}
                  value={note}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
                  className="resize-none text-sm"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button variant="outline" onClick={() => setStep('stable')} disabled={isPending} className="h-9">
                {t.confirm.cancel}
              </Button>
              <Button onClick={confirmBooking} disabled={isPending} className="h-9">
                {isPending ? t.confirm.confirming : t.confirm.confirm}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {isDragging && selectedHorse && typeof document !== 'undefined'
        ? createPortal(
            <div
              style={{
                position: 'fixed',
                left: ghostPos.x + 14,
                top: ghostPos.y + 14,
                zIndex: 9999,
                pointerEvents: 'none',
              }}
              className="flex items-center gap-2 rounded-md border border-primary bg-card px-3 py-2 shadow-lg"
            >
              <GripVertical className="size-4 text-muted-foreground/50" />
              <span className="text-sm font-semibold text-foreground">{selectedHorse.name}</span>
            </div>,
            document.body,
          )
        : null}
    </Dialog>
  )
}