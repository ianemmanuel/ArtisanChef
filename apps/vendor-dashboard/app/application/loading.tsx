import { Skeleton } from "@/components/ui/skeleton"

export default function ApplicationLoading() {
  return (
    <div className="glow-primary relative min-h-screen bg-background">
      <div className="border-b border-border/60 bg-card/60">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6">
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <Skeleton className="h-64 w-full max-w-lg rounded-2xl" />
      </div>
    </div>
  )
}
