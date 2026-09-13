'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import type { ReservationDetail } from '@/lib/db'

export function StableDocumentButton({
  riderName,
  reservations,
  officialDocUrl,
  name,
  dict,
}: {
  riderName: string
  reservations: ReservationDetail[]
  officialDocUrl: string | null
  name?: string
  dict: any
}) {
  const [open, setOpen] = useState(false)
  const t = dict.stableDocument

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="max-w-full whitespace-normal break-words text-center h-auto py-2">
          <FileText className="size-4 mr-2" aria-hidden />
          {name}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
        </DialogHeader>
        
        {officialDocUrl ? (
          <Button variant="secondary" className="w-full" asChild>
            <a href={officialDocUrl} target="_blank" rel="noreferrer">
              <FileText className="size-4 mr-2" aria-hidden />
              {t.view}
            </a>
          </Button>
        ) : (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            {t.empty}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}