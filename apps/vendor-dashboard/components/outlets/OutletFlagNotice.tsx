import { TriangleAlert } from "lucide-react"

/** Shown when an outlet is flagged by the automated content checks. */
export function OutletFlagNotice({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null

  return (
    <div
      className="rounded-xl border px-5 py-4 text-sm"
      style={{
        borderColor: "color-mix(in oklch, var(--warning) 40%, transparent)",
        background : "color-mix(in oklch, var(--warning) 8%, transparent)",
        color      : "var(--warning)",
      }}
    >
      <p className="flex items-center gap-2 font-semibold">
        <TriangleAlert className="size-4" aria-hidden />This outlet is under review
      </p>
      <p className="mt-1 text-xs opacity-80">
        Reasons: {reasons.join(", ").replace(/_/g, " ").toLowerCase()}
      </p>
    </div>
  )
}
