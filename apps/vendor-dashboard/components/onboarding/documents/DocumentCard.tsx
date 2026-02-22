"use client"

import { Button } from "@repo/ui/components/button"
import { Badge } from "@repo/ui/components/badge"
import { Loader2, Eye, Trash2 } from "lucide-react"

interface CardProps {
  req: any
  uploading: boolean
  deleting: boolean
  onUpload: (req: any, file: File) => void
  onDelete: (req: any) => void
  onPreview: (doc: any) => void
}

const ACCEPTED_TYPES = ".pdf,.png,.jpg,.jpeg"

export function DocumentCard({
  req,
  uploading,
  deleting,
  onUpload,
  onDelete,
  onPreview,
}: CardProps) {
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0]
    if (file) onUpload(req, file)
    e.target.value = ""
  }

  return (
    <div className="border rounded-xl bg-white px-5 py-4 flex justify-between items-center">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{req.name}</span>
          <Badge variant="outline">
            {req.isRequired ? "Required" : "Optional"}
          </Badge>
        </div>

        {req.uploadedDocument && (
          <p className="text-xs text-muted-foreground">
            {req.uploadedDocument.documentName}
          </p>
        )}
      </div>

      <div className="flex gap-2 items-center">
        {req.uploaded && req.uploadedDocument && (
          <>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onPreview(req.uploadedDocument)}
            >
              <Eye className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              disabled={deleting}
              onClick={() => onDelete(req)}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </>
        )}

        <label className="cursor-pointer">
          <Button
            size="sm"
            disabled={uploading || deleting}
            asChild
          >
            <span>
              {uploading
                ? "Uploading..."
                : req.uploaded
                ? "Replace"
                : "Upload"}
            </span>
          </Button>

          <input
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleChange}
            className="hidden"
          />
        </label>
      </div>
    </div>
  )
}