"use client"

import { Loader2, CircleAlert } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { useDocumentPreview } from "@/lib/queries/onboarding"
import type { UploadedDocumentInfo } from "@repo/types/vendor-app"

/*
 * In-app document preview — never opens a new tab. PDFs render in an
 * iframe, images render directly; anything else falls back to a plain
 * "open in a new tab" link since the browser can't preview it inline.
 */
export function DocumentPreviewSheet({
  document,
  open,
  onOpenChange,
}: {
  document: UploadedDocumentInfo | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data, isLoading, isError } = useDocumentPreview(document?.id, open)
  const isImage = document?.mimeType?.startsWith("image/")
  const isPdf = document?.mimeType === "application/pdf"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{document?.documentName ?? "Document"}</SheetTitle>
          <SheetDescription>Preview only — this file was uploaded as part of your application.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 items-center justify-center overflow-hidden px-4 pb-4">
          {isLoading ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          ) : isError || !data?.url ? (
            <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
              <CircleAlert className="size-6 text-destructive" />
              Couldn&apos;t load this document.
            </div>
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.url} alt={document?.documentName ?? "Document preview"} className="max-h-full max-w-full rounded-lg object-contain" />
          ) : isPdf ? (
            <iframe src={data.url} title={document?.documentName ?? "Document preview"} className="h-full w-full rounded-lg border border-border" />
          ) : (
            <a href={data.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary underline">
              Open document
            </a>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
