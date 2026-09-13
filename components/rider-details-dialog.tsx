'use client'

import { useState } from 'react'
import { getRiderHorses } from '@/app/actions/stables'
import type { Horse } from '@/lib/db'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Info } from 'lucide-react'
import { GENDER_META, type GenderType } from '@/lib/horse-types'

function formatMessage(str: string, vars: Record<string, string | number>) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''))
}

export function RiderDetailsDialog({ 
  riderId, 
  riderName,
  dict 
}: { 
  riderId: number
  riderName: string
  dict: any
}) {
  const [open, setOpen] = useState(false)
  const [horses, setHorses] = useState<Horse[]>([])
  const [loading, setLoading] = useState(false)
  const t = dict.riderDetails

  async function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen && horses.length === 0) {
      setLoading(true)
      const data = await getRiderHorses(riderId)
      setHorses(data)
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Info className="mr-2 size-4" />
          {t.button}
        </Button>
      </DialogTrigger>
      
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{formatMessage(t.title, { name: riderName })}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-2">
            {horses.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{t.empty}</p>
            ) : (
              horses.map((h) => {
                const genderKey = (h.gender as GenderType) || 'tr'
                const meta = GENDER_META[genderKey]
                
                return (
                  <div 
                    key={h.id} 
                    className={`flex items-center justify-between rounded-md border p-3 ${meta.cell}`}
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <p className={`font-medium truncate ${meta.text}`}>{h.name}</p>
                      <p className="text-xs opacity-80 truncate">{t.internationalId}: {h.international_id || t.notAvailable}</p>
                    </div>
                    
                    <Badge className={`${meta.dot} text-white border-transparent shrink-0`}>
                      {meta.label}
                    </Badge>
                  </div>
                )
              })
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}