'use client'

import { useMemo, useState } from 'react'
import { Search, Mail, Phone } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { RiderDirectoryRow } from '@/app/actions/stables'
import { RiderDetailsDialog } from '@/components/rider-details-dialog'

export function RiderDirectory({ 
  riders,
  dict 
}: { 
  riders: RiderDirectoryRow[]
  dict: any 
}) {
  const [query, setQuery] = useState('')
  const t = dict.riderDirectory

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return riders
    return riders.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.phone ?? '').toLowerCase().includes(q),
    )
  }, [riders, query])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-[28%] size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="pl-9"
          aria-label={t.searchLabel}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t.noResults}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((r) => (
            <Card key={r.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.joined} {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Badge variant="secondary">{r.horse_count} {t.horses}</Badge>
                  <Badge>{r.active_reservations} {t.active}</Badge>
                </div>
              </div>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Mail className="size-3.5" aria-hidden />
                  {r.email}
                </span>
                {r.phone ? (
                  <span className="flex items-center gap-2">
                    <Phone className="size-3.5" aria-hidden />
                    {r.phone}
                  </span>
                ) : null}
                <RiderDetailsDialog riderId={r.id} riderName={r.full_name} dict={dict} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}