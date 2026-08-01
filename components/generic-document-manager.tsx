'use client'

import { useState } from "react"
import { toast } from "sonner"
import { UploadButton } from "@uploadthing/react"
import type { OurFileRouter } from "@/app/api/uploadthing/core"
import { setOfficialDocument, deleteDocument } from "@/app/actions/stables"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Trash2, Loader2, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDictionary } from '@/context/dictionary-context'

function formatMessage(str: string, vars: Record<string, string | number>) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''))
}

export function GenericDocumentManager({ 
  currentUrl, 
  docKey, 
  title, 
  description, 
  endpoint,
  type = 'document',
  dict
}: { 
  currentUrl: string | null;
  docKey: string;
  title: string;
  description: string;
  endpoint: keyof OurFileRouter;
  type?: 'document' | 'image';
  dict: any;
}) {
  const [url, setUrl] = useState<string | null>(currentUrl)
  const [isDeleting, setIsDeleting] = useState(false)
  const t = dict.documentManager
  const { dictionary,lang  } = useDictionary()

  const handleDelete = async () => {
    if (!url) return
    setIsDeleting(true)
    const res = await deleteDocument(url, docKey,lang)
    if (res.ok) {
      setUrl(null)
      toast.success(formatMessage(t.deleteSuccess, { title }))
    } else {
      toast.error(
  formatMessage(t.deleteError, {
    error: res.error ?? "Unknown error",
  })
)
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
          <div className="flex flex-col gap-3 rounded-md border p-3 text-sm">
            {type === 'image' && (
              <div className="relative flex justify-center bg-muted/50 rounded-sm overflow-hidden p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={title} className="max-h-48 w-auto object-contain" />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden pr-2">
                {type === 'image' ? <ImageIcon className="size-4 shrink-0 text-primary" /> : <FileText className="size-4 shrink-0 text-primary" />}
                <a href={url} target="_blank" rel="noreferrer" className="truncate font-medium hover:underline">
                  {type === 'image' ? t.viewImage : t.viewDocument}
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
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        )}

        <div className="rounded-md border border-dashed p-4">
          <UploadButton<OurFileRouter, typeof endpoint>
            endpoint={endpoint}
            onClientUploadComplete={async (res) => {
              if (res?.[0]) {
                const newUrl = res[0].ufsUrl
                const actionRes = await setOfficialDocument(newUrl, docKey,lang)
                if (actionRes.ok) {
                  setUrl(newUrl)
                  toast.success(formatMessage(t.updateSuccess, { title }))
                } else {
                  toast.error(t.databaseError)
                }
              }
            }}
            onUploadError={(error: Error) => {
              toast.error(formatMessage(t.uploadError, { error: error.message }))
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}