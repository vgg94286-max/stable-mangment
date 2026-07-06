'use client'

import { useState } from "react"
import { toast } from "sonner"
import { UploadButton } from "@uploadthing/react"
import type { OurFileRouter } from "@/app/api/uploadthing/core"
import { setOfficialDocument } from "@/app/actions/stables"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"

export function FacilityDocumentManager({ currentUrl }: { currentUrl: string | null }) {
  const [url, setUrl] = useState<string | null>(currentUrl)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Official Facility Document</CardTitle>
        <CardDescription>
          Upload a single PDF or Image (e.g., Facility Rules, Map) for riders to view. 
          Uploading a new file will replace the current one.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {url ? (
          <div className="flex items-center gap-2 rounded-md border p-3 text-sm">
            <FileText className="size-4 text-primary" />
            <a href={url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
              View Current Document
            </a>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No document currently uploaded.</p>
        )}

        <div className="rounded-md border border-dashed p-4">
          <UploadButton<OurFileRouter, "facilityDocument">
            endpoint="facilityDocument"
            onClientUploadComplete={async (res) => {
              if (res?.[0]) {
                const newUrl = res[0].ufsUrl
                const actionRes = await setOfficialDocument(newUrl)
                if (actionRes.ok) {
                  setUrl(newUrl)
                  toast.success("Document updated successfully.")
                } else {
                  toast.error("File uploaded, but failed to save to database.")
                }
              }
            }}
            onUploadError={(error: Error) => {
              toast.error(`Upload failed: ${error.message}`)
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}