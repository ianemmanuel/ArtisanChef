import { Card, CardContent } from "@repo/ui/components/card"
import { Badge } from "@repo/ui/components/badge" 


export default function PreviewSection({ 
  watchIsActive, 
  watchIsFeatured, 
  galleryFiles 
}: { 
  watchIsActive: boolean
  watchIsFeatured: boolean
  galleryFiles: File[]
}) {
  return (
    <Card className="border shadow-sm dark:border-muted">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Category Preview</h3>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={watchIsActive ? "default" : "secondary"} className="text-xs">
                {watchIsActive ? "Active" : "Inactive"}
              </Badge>
              {watchIsFeatured && (
                <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:border-amber-400 dark:text-amber-300">
                  Featured
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Gallery Images</p>
            <Badge variant="outline" className="mt-1">
              {galleryFiles.length} / 5
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
