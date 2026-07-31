'use client'

import {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { StableGridItem } from '@/lib/db'
import { GENDER_META, type GenderType } from '@/lib/horse-types'

const ROW_HEIGHT = 76
const GAP = 8

function useColumnCount(ref: React.RefObject<HTMLDivElement | null>) {
  const [cols, setCols] = useState(4)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const compute = () => {
      const w = el.clientWidth
      if (w < 360) setCols(2)
      else if (w < 520) setCols(3)
      else if (w < 700) setCols(4)
      else if (w < 900) setCols(5)
      else if (w < 1100) setCols(6)
      else if (w < 1300) setCols(7)
      else setCols(8)
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return cols
}

export function StableCell({
  item,
  onClick,
  selected,
}: {
  // 1. Remove the intersection type; just use StableGridItem
  item: StableGridItem 
  onClick?: (item: StableGridItem) => void
  selected?: boolean
}) {
  const occupied = item.status === 'occupied'
  const blocked = !item.is_active
  
  // 2. Safely cast the string to GenderType when looking it up
  const meta = item.gender ? GENDER_META[item.gender as GenderType] : null

  return (
    <button
      type="button"
      onClick={() => onClick?.(item)}
      disabled={blocked && !onClick} // Prevent interaction if purely viewing as a rider
      aria-label={`Stable ${item.label}`}
      className={cn(
        'flex h-[68px] flex-col items-start justify-center gap-0.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors',
        blocked 
          ? 'bg-muted/50 border-dashed border-muted-foreground/30 opacity-60 cursor-pointer'
          : occupied && meta
            ? cn(meta.cell, meta.text)
            : 'border-border bg-card hover:border-primary/50 hover:bg-secondary',
        selected && 'ring-2 ring-primary ring-offset-1',
      )}
    >
      <span className="text-sm font-semibold leading-none">{item.label}</span>
      {blocked ? (
        <span className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
          Blocked
        </span>
      ) : occupied ? (
        <span className="mt-0.5 line-clamp-1 w-full text-[11px] leading-tight opacity-90">
          {item.horse_name}
        </span>
      ) : (
        <span className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
          Available
        </span>
      )}
    </button>
  )
}

export function StableGrid({
  items,
  onCellClick,
  selectedStableId,
  toolbar,
}: {
  items: StableGridItem[]
  onCellClick?: (item: StableGridItem) => void
  selectedStableId?: number | null
  toolbar?: ReactNode
}) {
  const [query, setQuery] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const cols = useColumnCount(measureRef)

  const barns = useMemo(
    () => Array.from(new Set(items.map((i) => i.barn))).sort(),
    [items],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.horse_name?.toLowerCase().includes(q) ||
        i.rider_name?.toLowerCase().includes(q),
    )
  }, [items, query])

  // Build a flat list of "rows": each row is either a barn header or a set of cells.
  type Row =
    | { kind: 'header'; barn: string }
    | { kind: 'cells'; cells: StableGridItem[] }

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    const byBarn = new Map<string, StableGridItem[]>()
    for (const it of filtered) {
      if (!byBarn.has(it.barn)) byBarn.set(it.barn, [])
      byBarn.get(it.barn)!.push(it)
    }
    for (const barn of Array.from(byBarn.keys()).sort()) {
      out.push({ kind: 'header', barn })
      const cells = byBarn.get(barn)!
      for (let i = 0; i < cells.length; i += cols) {
        out.push({ kind: 'cells', cells: cells.slice(i, i + cols) })
      }
    }
    return out
  }, [filtered, cols])

  // Map each barn to its row index for jump navigation.
  const barnRowIndex = useMemo(() => {
    const map = new Map<string, number>()
    rows.forEach((r, idx) => {
      if (r.kind === 'header' && !map.has(r.barn)) map.set(r.barn, idx)
    })
    return map
  }, [rows])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => (rows[index].kind === 'header' ? 44 : ROW_HEIGHT + GAP),
    overscan: 8,
  })

  const jumpToBarn = useCallback(
    (barn: string) => {
      const idx = barnRowIndex.get(barn)
      if (idx != null) virtualizer.scrollToIndex(idx, { align: 'start' })
    },
    [barnRowIndex, virtualizer],
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stable, horse, or rider"
            className="pl-9"
            aria-label="Search stables"
          />
        </div>
        {toolbar}
      </div>

      {/* Sticky A-Z barn navigation */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-2">
        {barns.map((barn) => (
          <button
            key={barn}
            type="button"
            onClick={() => jumpToBarn(barn)}
            className="flex size-7 items-center justify-center rounded-md text-xs font-medium text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            {barn}
          </button>
        ))}
      </div>

      <div ref={measureRef} className="w-full">
        <div
          ref={scrollRef}
          className="h-[560px] overflow-auto rounded-lg border border-border bg-background/40 p-3"
        >
          <div
            style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}
          >
            {virtualizer.getVirtualItems().map((vRow) => {
              const row = rows[vRow.index]
              return (
                <div
                  key={vRow.key}
                  data-index={vRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vRow.start}px)`,
                  }}
                >
                  {row.kind === 'header' ? (
                    <div className="sticky top-0 z-10 flex items-center gap-2 py-2">
                      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                        {row.barn}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        Barn {row.barn}
                      </span>
                    </div>
                  ) : (
                    <div
                      className="grid gap-2 pb-2"
                      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                    >
                      {row.cells.map((cell) => (
                        <StableCell
                          key={cell.id}
                          item={cell}
                          onClick={onCellClick}
                          selected={selectedStableId === cell.id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No stables match your search.
        </p>
      ) : null}
    </div>
  )
}
