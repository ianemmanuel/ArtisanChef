"use client"

import { Progress } from "@repo/ui/components/progress"

interface Props {
  progress: number
}

export function DocumentsHeader({ progress }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Required Documents</h2>
      <Progress value={progress} />
      <p className="text-sm text-muted-foreground">
        {progress}% complete
      </p>
    </div>
  )
}