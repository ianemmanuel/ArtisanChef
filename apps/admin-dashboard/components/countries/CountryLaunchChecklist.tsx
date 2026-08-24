import { CheckCircle2, XCircle } from "lucide-react"

interface Props {
  vendorTypeCount  : number
  documentTypeCount: number
  readyToActivate  : boolean
  status           : string
}

/**
 * Pre-activation checklist — a country needs at least one vendor type and
 * one document type before it can go ACTIVE (see activateCountry in
 * admin.country.service.ts). Shown even once active, as a record of what
 * unlocked activation.
 */
export function CountryLaunchChecklist({ vendorTypeCount, documentTypeCount, readyToActivate, status }: Props) {
  const rows = [
    { label: "Vendor types linked",   count: vendorTypeCount,   href: "#vendor-types" },
    { label: "Document types created", count: documentTypeCount, href: "#document-types" },
  ]

  return (
    <div className="admin-card space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Launch Checklist</h2>
        <p className="text-xs text-muted-foreground">
          {status === "ACTIVE"
            ? "What unlocked activation for this country."
            : readyToActivate
              ? "Requirements met — this country can now be activated."
              : "Both items are required before this country can be activated."}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => {
          const done = row.count > 0
          return (
            <a
              key={row.label}
              href={row.href}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-2.5">
                {done
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  : <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className="text-sm text-foreground">{row.label}</span>
              </div>
              <span className="text-sm font-medium tabular-nums text-foreground">{row.count}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
