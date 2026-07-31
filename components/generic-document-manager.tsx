// components/generic-document-manager.tsx
'use client'

import { useState } from "react"
import { toast } from "sonner"
import { UploadButton } from "@uploadthing/react"
import type { OurFileRouter } from "@/app/api/uploadthing/core"
import { setOfficialDocument, deleteDocument } from "@/app/actions/stables"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function GenericDocumentManager({ 
  currentUrl, 
  docKey, 
  title, 
  description, 
  endpoint 
}: { 
  currentUrl: string | null;
  docKey: string;
  title: string;
  description: string;
  endpoint: keyof OurFileRouter;
}) {
  const [url, setUrl] = useState<string | null>(currentUrl)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!url) return
    setIsDeleting(true)
    const res = await deleteDocument(url, docKey)
    if (res.ok) {
      setUrl(null)
      toast.success(`${title} deleted successfully.`)
    } else {
      toast.error(`Failed to delete: ${res.error}`)
    }
    setIsDeleting(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {url ? (
          <div className="flex items-center justify-between rounded-md border p-3 text-sm">
            <div className="flex items-center gap-2 overflow-hidden pr-2">
              <FileText className="size-4 shrink-0 text-primary" />
              <a href={url} target="_blank" rel="noreferrer" className="truncate font-medium hover:underline">
                View Current Document
              </a>
            </div>
            <Button 
              variant="destructive" 
              size="icon" 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="shrink-0"
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No document currently uploaded.</p>
        )}

        <div className="rounded-md border border-dashed p-4">
          <UploadButton<OurFileRouter, typeof endpoint>
            endpoint={endpoint}
            onClientUploadComplete={async (res) => {
              if (res?.[0]) {
                const newUrl = res[0].ufsUrl
                const actionRes = await setOfficialDocument(newUrl, docKey)
                if (actionRes.ok) {
                  setUrl(newUrl)
                  toast.success(`${title} updated successfully.`)
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