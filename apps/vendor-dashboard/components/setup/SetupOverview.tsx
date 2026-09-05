import Link from "next/link"
import { ArrowRight, CheckCircle2, Circle, Clock } from "lucide-react"
import type { VendorGoLiveStatus } from "@repo/types/vendor-app"
import { readinessRequirements, readinessProgress, type ReadinessRequirement } from "@/lib/readiness"
import { GoLiveButton } from "@/components/readiness/GoLiveButton"
import { cn } from "@/lib/utils"

/*
 * The /setup overview — server-rendered off the authoritative
 * getVendorGoLiveStatus (Vendor 1B, carried on the session). It only
 * communicates state → progress → the three requirements → where to go
 * to complete each. Readiness is never re-derived here; every `met` flag
 * comes straight off the backend result. The single client island is
 * <GoLiveButton>, which owns the publish / unpublish action.
 */

function StateBadge({ status }: { status: VendorGoLiveStatus }) {
  if (status.isPublished) {
    return <span className="rounded-full bg-success-bg px-2.5 py-1 text-xs font-medium text-success">Live</span>
  }
  if (status.canGoLive) {
    return <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">Ready to go live</span>
  }
  return <span className="rounded-full bg-warning-bg px-2.5 py-1 text-xs font-medium text-warning">Setup in progress</span>
}

function RequirementIcon({ req }: { req: ReadinessRequirement }) {
  if (req.met) return <CheckCircle2 className="size-5 shrink-0 text-success" />
  if (req.key === "profile" && req.todoLabel.includes("under review")) {
    return <Clock className="size-5 shrink-0 text-warning" />
  }
  return <Circle className="size-5 shrink-0 text-muted-foreground" />
}

export function SetupOverview({ status }: { status: VendorGoLiveStatus }) {
  const requirements = readinessRequirements(status)
  const { done, total } = readinessProgress(status)
  const pct = Math.round((done / total) * 100)

  return (
    <div className="space-y-6">
      {/* Progress + go-live */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Selling readiness</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {done} of {total} requirements complete — they can be done in any order.
            </p>
          </div>
          <StateBadge status={status} />
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-5">
          <GoLiveButton />
          {!status.canGoLive && (
            <p className="mt-2 text-xs text-muted-foreground">
              Complete the requirements below to publish your storefront.
            </p>
          )}
        </div>
      </section>

      {/* Requirements */}
      <section className="space-y-3">
        {requirements.map((req) => (
          <div
            key={req.key}
            className={cn(
              "flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 sm:p-5",
              req.met ? "border-success/30" : "border-border",
            )}
          >
            <RequirementIcon req={req} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{req.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {req.met ? req.doneLabel : req.todoLabel}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/80">{req.description}</p>
            </div>
            <Link
              href={req.href}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                req.met
                  ? "border border-border text-foreground hover:bg-muted"
                  : "bg-primary text-primary-foreground hover:opacity-90",
              )}
            >
              {req.met ? "Manage" : "Set up"}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ))}
      </section>
    </div>
  )
}
