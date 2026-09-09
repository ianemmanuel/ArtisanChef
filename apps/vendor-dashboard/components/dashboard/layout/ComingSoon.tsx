import { Hammer } from "lucide-react"

/*
 * One honest placeholder for a route that exists but whose feature doesn't
 * yet — rather than each stub inventing its own empty div. Says plainly
 * that there's nothing here, instead of rendering an empty shell that reads
 * as a bug.
 */
export function ComingSoon({ feature, note }: { feature: string; note?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted">
        <Hammer className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-foreground">{feature} is coming</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {note ?? "This section isn't available yet. It'll appear here once the feature ships."}
      </p>
    </div>
  )
}
