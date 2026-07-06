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
}: {
  riderName: string
  reservations: ReservationDetail[]
  officialDocUrl: string | null
}) {
  const [open, setOpen] = useState(false)

 

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
  <FileText className="size-4" aria-hidden />
  Stable Management Document
</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Stable Management Document</DialogTitle>
        </DialogHeader>
        
        
        {officialDocUrl && (
          <Button variant="secondary" className="w-full" asChild>
            <a href={officialDocUrl} target="_blank" rel="noreferrer">
              <FileText className="size-4 mr-2" aria-hidden />
              View Official Facility Document
            </a>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
