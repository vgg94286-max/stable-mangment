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
import { MapPin, Map } from 'lucide-react'

export function LocationModalButton({
  imageUrl,
  mapUrl,
  name,
  dict,
}: {
  imageUrl: string | null
  mapUrl: string | null
  name?: string
  dict: any
}) {
  const [open, setOpen] = useState(false)
  const t = dict.locationModal
  const displayName = name || t.defaultName

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="max-w-full whitespace-normal break-words text-center h-auto py-2">
          <MapPin className="mr-2 size-4" aria-hidden />
          {displayName}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{displayName}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-5 mt-2">
          {imageUrl ? (
            <div className="relative flex justify-center items-center overflow-hidden rounded-md border bg-muted/30 p-2 min-h-[200px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Facility Location Map" className="max-h-[50vh] w-auto object-contain rounded-sm" />
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t.noImage}
            </div>
          )}

          {mapUrl && (
            <Button className="w-full" size="lg" asChild>
              <a href={mapUrl} target="_blank" rel="noreferrer">
                <Map className="mr-2 size-4" aria-hidden />
                {t.openMaps}
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}