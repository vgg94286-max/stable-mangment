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
import { FileText, Printer } from 'lucide-react'
import type { ReservationDetail } from '@/lib/db'
import { GENDER_META, type GenderType , GENDER_OPTIONS } from '@/lib/horse-types'

export function StableDocumentButton({
  riderName,
  reservations,
  officialDocUrl,
  name,
}: {
  riderName: string
  reservations: ReservationDetail[]
  officialDocUrl: string | null
  name?: string
}) {
  const [open, setOpen] = useState(false)

 

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline"
      className="max-w-full whitespace-normal break-words text-center h-auto py-2" />}>
  <FileText className="size-4" aria-hidden />
  {name}
</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
        </DialogHeader>
        
        
        {officialDocUrl ? (
  <Button variant="secondary" className="w-full" asChild>
    <a href={officialDocUrl} target="_blank" rel="noreferrer">
      <FileText className="size-4 mr-2" aria-hidden />
      View Official Document
    </a>
  </Button>
) : (
  <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
    No document is available at the moment.
  </div>
)}
      </DialogContent>
    </Dialog>
  )
}
