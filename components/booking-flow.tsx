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

// Step 'confirm' was removed: booking (including the note) now happens inline,
// via a small popup shown at the moment a horse is dropped onto a stable.
type Step = 'horse' | 'stable'

// A drop that has landed on a valid stable cell but hasn't been committed yet.
// We hold it here while the note popup is open, and only call reserveStable()
// once the rider confirms (or skips the note).
type PendingDrop = {
  horse: Horse
  stable: StableGridItem
  x: number
  y: number
}

export function BookingFlow({
  horses,
  stables,
}: {
  horses: Horse[]
  stables: StableGridItem[]
}) {
  const router = useRouter()
  const { dictionary, lang } = useDictionary()
  const t = dictionary.bookingFlow

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('horse')

  // Multiple horses can now be selected in step 1 and booked one-by-one via
  // drag & drop in step 2.
  const [selectedHorseIds, setSelectedHorseIds] = useState<number[]>([])
  const [localHorses, setLocalHorses] = useState<Horse[]>(horses)
  const [localStables, setLocalStables] = useState<StableGridItem[]>(stables)
  const [bookedHorseIds, setBookedHorseIds] = useState<Set<number>>(new Set())

  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [internationalId, setInternationalId] = useState('')
  const [gender, setGender] = useState('')

  const [isDragging, setIsDragging] = useState(false)
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 })
  const [draggingHorse, setDraggingHorse] = useState<Horse | null>(null)
  const hoveredCellRef = useRef<HTMLElement | null>(null)

  // Note popup shown right where the horse was dropped.
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)
  const [noteText, setNoteText] = useState('')

  const gridScrollRef = useRef<HTMLDivElement | null>(null)

  // Keep the local working copies in sync with fresh server data whenever the
  // dialog is closed. Without this, if a reservation gets released elsewhere
  // on the page (e.g. from RiderReservations) while this dialog is closed,
  // router.refresh() brings fresh `stables`/`horses` props into this
  // component, but useState's initial value is only read once on mount — so
  // the grid would keep showing the stale snapshot from the last time the
  // dialog happened to be open, until it was opened and closed again. We
  // skip syncing while `open` is true so an in-progress multi-horse booking
  // session (bookedHorseIds, etc.) never gets clobbered mid-flow.
  useEffect(() => {
    if (!open) {
      setLocalStables(stables)
      setLocalHorses(horses)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stables, horses, open])

  const pendingHorses = localHorses.filter((h) => selectedHorseIds.includes(h.id))
  const allBooked = selectedHorseIds.length > 0 && bookedHorseIds.size === selectedHorseIds.length

  function reset() {
    setStep('horse')
    setSelectedHorseIds([])
    setLocalHorses(horses)
    setLocalStables(stables)
    setBookedHorseIds(new Set())
    setDraggingHorse(null)
    setPendingDrop(null)
    setNoteText('')
    setName('')
    setInternationalId('')
    setGender('')
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) reset()
  }

  function toggleHorseSelection(id: number) {
    setSelectedHorseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
    setName('')
    setInternationalId('')
    setGender('')
  }

  async function goToStableStep() {
    const isCreatingNew = Boolean(name.trim() || internationalId.trim() || gender.trim())

    if (!isCreatingNew) {
      if (selectedHorseIds.length === 0) {
        toast.error(t.horse.validation)
        return
      }
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
        lang: lang,
      })
      if (!res.ok || !res.horseId) {
        toast.error(res.error || t.horse.saveError)
        return
      }
      toast.success(t.horse.saveSuccess)
      const newHorse = {
        id: res.horseId,
        name,
        gender: gender || null,
        international_id: internationalId ? parseInt(internationalId, 10) : null,
        notes: null,
      } as unknown as Horse
      setLocalHorses((prev) => [...prev, newHorse])
      setSelectedHorseIds((prev) => [...prev, res.horseId as number])
      router.refresh()
      setStep('stable')
    })
  }

  // Tap-to-book was removed: with multiple horses possibly selected, tapping a
  // stable is ambiguous about which horse it's for, so booking now happens
  // exclusively via drag & drop. This handler is intentionally a no-op — it's
  // still passed down so StableCell's existing enabled/disabled styling (which
  // depends on onClick being present) stays exactly as it was.
  function handleStableClick(_item: StableGridItem) {}

  function handleDropHorse(stableId: number, x: number, y: number) {
    const horse = draggingHorse
    if (!horse) return
    const item = localStables.find((s) => s.id === stableId)
    if (!item || !item.is_active || item.status === 'occupied') return

    setPendingDrop({ horse, stable: item, x, y })
    setNoteText('')
  }

  function handlePointerDownOnHorse(e: React.PointerEvent<HTMLDivElement>, horse: Horse) {
    // Prevent this from also being treated as a text-selection or a click-drag on the card.
    e.preventDefault()
    setGhostPos({ x: e.clientX, y: e.clientY })
    setDraggingHorse(horse)
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
        if (!Number.isNaN(id)) handleDropHorse(id, e.clientX, e.clientY)
      }
      setIsDragging(false)
      setDraggingHorse(null)
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

  function cancelDrop() {
    setPendingDrop(null)
    setNoteText('')
  }

  function confirmDrop() {
    if (!pendingDrop) return
    const { horse, stable } = pendingDrop
    const noteToSave = noteText

    startTransition(async () => {
      const res = await reserveStable(stable.id, horse.id, lang, noteToSave)
      if (!res.ok) {
        toast.error(res.error || t.confirm.reservationError)
        return
      }
      toast.success(t.confirm.reservationSuccess.replace('{{label}}', stable.label))

      setBookedHorseIds((prev) => {
        const next = new Set(prev)
        next.add(horse.id)
        return next
      })
      setLocalStables((prev) =>
        prev.map((s) =>
          s.id === stable.id
            ? {
                ...s,
                status: 'occupied',
                horse_id: horse.id,
                horse_name: horse.name,
                gender: (horse as { gender?: string | null }).gender ?? s.gender,
              }
            : s,
        ),
      )
      setPendingDrop(null)
      setNoteText('')
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
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {step === 'horse' && t.steps.horseDescription}
            {step === 'stable' && t.steps.stableDescription}
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
                      const active = selectedHorseIds.includes(h.id)
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => toggleHorseSelection(h.id)}
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
                    onChange={(e) => setName(e.target.value)}
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
                    onChange={(e) => setInternationalId(e.target.value)}
                    placeholder={t.horse.internationalIdPlaceholder}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="h-gender" className="text-xs sm:text-sm">{t.horse.type} *</Label>
                  <Select
                    value={gender}
                    onValueChange={(v) => setGender(v ?? '')}
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
        ) : (
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="self-start -ml-2 text-muted-foreground h-8"
                onClick={() => {
                  setPendingDrop(null)
                  setStep('horse')
                }}
              >
                <ArrowLeft className="mr-2 size-4" aria-hidden />
                {t.stable.back}
              </Button>
            </div>

            {pendingHorses.length > 0 && (
              <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {t.stable.selectedHorse}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {bookedHorseIds.size}/{pendingHorses.length}
                  </span>
                </div>

                {allBooked ? (
                  <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-2">
                    <Check className="size-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {lang === 'ar' ? 'تم حجز جميع الخيول' : 'All horses booked'}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {pendingHorses.map((h) => {
                      const booked = bookedHorseIds.has(h.id)
                      const isBeingDragged = isDragging && draggingHorse?.id === h.id
                      return (
                        <div
                          key={h.id}
                          onPointerDown={
                            booked ? undefined : (e) => handlePointerDownOnHorse(e, h)
                          }
                          style={{ touchAction: 'none' }}
                          className={cn(
                            'flex select-none items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 shadow-sm transition-colors',
                            booked
                              ? 'opacity-50'
                              : 'cursor-grab hover:border-primary active:cursor-grabbing',
                            isBeingDragged && 'opacity-50',
                          )}
                        >
                          {booked ? (
                            <Check className="size-4 text-primary" />
                          ) : (
                            <GripVertical className="size-4 text-muted-foreground/50" />
                          )}
                          <span className="text-sm font-semibold text-foreground">{h.name}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {!allBooked && (
                  <span className="text-[11px] text-muted-foreground">{t.stable.dragHint}</span>
                )}
              </div>
            )}

            <div className="h-px w-full bg-border" />

            <StableGrid
              items={localStables}
              onCellClick={handleStableClick}
              isAdmin={false}
              dict={dictionary}
              scrollContainerRef={gridScrollRef}
            />
          </div>
        )}
      </DialogContent>

      {isDragging && draggingHorse && typeof document !== 'undefined'
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
              <span className="text-sm font-semibold text-foreground">{draggingHorse.name}</span>
            </div>,
            document.body,
          )
        : null}

      {/* Note popup: shown right where the horse was dropped, so the note is
          captured at drop-time instead of a separate confirmation step. */}
      {pendingDrop && typeof document !== 'undefined'
        ? createPortal(
            <>
              <div
                onClick={cancelDrop}
                style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
              />
              <div
                style={{
                  position: 'fixed',
                  left: Math.min(
                    Math.max(pendingDrop.x - 130, 12),
                    (typeof window !== 'undefined' ? window.innerWidth : 1024) - 272,
                  ),
                  top: Math.min(
                    pendingDrop.y + 16,
                    (typeof window !== 'undefined' ? window.innerHeight : 768) - 190,
                  ),
                  zIndex: 9999,
                }}
                className="flex w-64 flex-col gap-2 rounded-lg border border-primary bg-card p-3 shadow-xl"
              >
                <span className="text-xs font-semibold text-foreground">
                  {pendingDrop.horse.name} → {pendingDrop.stable.label}
                </span>
                <Textarea
                  autoFocus
                  value={noteText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteText(e.target.value)}
                  placeholder={t.confirm.notePlaceholder}
                  className="resize-none text-xs"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={cancelDrop}
                    disabled={isPending}
                  >
                    {t.confirm.cancel}
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={confirmDrop}
                    disabled={isPending}
                  >
                    {isPending ? t.confirm.confirming : t.confirm.confirm}
                  </Button>
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </Dialog>
  )
}