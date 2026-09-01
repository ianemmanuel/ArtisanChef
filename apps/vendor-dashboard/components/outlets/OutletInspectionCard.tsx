"use client"

import { CalendarClock, CheckCircle2, CircleAlert, Clock, ShieldOff, Ban } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useOutletInspections } from "@/lib/queries/outlet-inspections"
import type { OutletInspectionStatus, OutletMealPlanReadiness } from "@/types/outlet"

/*
 * Read-only view of this outlet's premises inspection. Required (in most
 * countries) before the outlet can offer meal plans. The vendor never
 * schedules or acts on it — our ops team does — they just see where it stands.
 */

const META: Record<OutletInspectionStatus, { label: string; icon: typeof Clock; tone: string }> = {
  SCHEDULED  : { label: "Scheduled",   icon: CalendarClock, tone: "var(--warning)" },
  IN_PROGRESS: { label: "In progress", icon: Clock,         tone: "var(--warning)" },
  PASSED     : { label: "Passed",      icon: CheckCircle2,  tone: "var(--success)" },
  FAILED     : { label: "Not passed",  icon: CircleAlert,   tone: "var(--destructive)" },
  WAIVED     : { label: "Waived",      icon: ShieldOff,     tone: "var(--muted-foreground)" },
  CANCELLED  : { label: "Cancelled",   icon: Ban,           tone: "var(--muted-foreground)" },
}

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString() : null
}

export function OutletInspectionCard({
  outletId, readiness,
}: {
  outletId: string
  readiness?: OutletMealPlanReadiness
}) {
  const { data, isLoading } = useOutletInspections(outletId)

  // Nothing to show if this country doesn't require inspections and none exist.
  const required = readiness?.inspectionRequired ?? true
  if (isLoading) return <Skeleton className="h-24 w-full rounded-2xl" />
  if (!data || (data.length === 0 && !required)) return null

  const current = data.find((i) => i.status === "SCHEDULED" || i.status === "IN_PROGRESS")
    ?? data.find((i) => ["PASSED", "FAILED", "WAIVED"].includes(i.status))
    ?? data[0]

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center gap-2">
        <CalendarClock className="size-4 shrink-0 text-[var(--primary)]" />
        <p className="text-sm font-semibold text-[var(--foreground)]">Premises inspection</p>
      </div>

      {!current ? (
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          This outlet needs a premises inspection before it can offer meal plans. Our team will be in touch to arrange a visit.
        </p>
      ) : (() => {
        const m = META[current.status]
        const Icon = m.icon
        return (
          <div className="mt-3 flex items-start gap-3">
            <Icon className="mt-0.5 size-4 shrink-0" style={{ color: m.tone }} />
            <div className="min-w-0 text-sm">
              <p className="font-medium text-[var(--foreground)]">{m.label}</p>
              {current.status === "SCHEDULED" && current.scheduledFor && (
                <p className="mt-0.5 text-[var(--muted-foreground)]">
                  Visit booked for {fmt(current.scheduledFor)}. Please have the premises ready.
                </p>
              )}
              {current.status === "IN_PROGRESS" && (
                <p className="mt-0.5 text-[var(--muted-foreground)]">The inspection is underway.</p>
              )}
              {current.status === "PASSED" && (
                <p className="mt-0.5 text-[var(--muted-foreground)]">
                  Passed{current.completedAt ? ` on ${fmt(current.completedAt)}` : ""}
                  {current.validUntil ? ` · re-inspection due ${fmt(current.validUntil)}` : ""}.
                </p>
              )}
              {current.status === "FAILED" && (
                <p className="mt-0.5 text-[var(--muted-foreground)]">
                  {current.failureReasons.length > 0
                    ? `Address: ${current.failureReasons.join("; ")}. `
                    : ""}
                  Contact support to arrange a re-inspection.
                </p>
              )}
              {current.status === "WAIVED" && (
                <p className="mt-0.5 text-[var(--muted-foreground)]">The inspection requirement has been waived for this outlet.</p>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
