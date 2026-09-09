import { MapPin, Phone, Mail, Star, Utensils } from "lucide-react"
import { Card, CardContent } from "@repo/ui/components/card"
import type { Outlet } from "@/types/outlet"

/*
 * The outlet overview card — address, contact, quick stats and cuisines.
 * Extracted from the detail page, which had ~120 lines of this markup inline
 * and was the only reason that page was long.
 */

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 text-center">
      <span className="text-lg font-bold text-[var(--foreground)]">{value}</span>
      <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
    </div>
  )
}

export function OutletDetailHero({ outlet }: { outlet: Outlet }) {
  // "Operational" here is the display dot only — the authoritative answer is
  // outlet.goLiveStatus, rendered separately by OutletGoLivePanel.
  const isOperational =
    !outlet.vendorDisabledAt && outlet.adminStatus === "ACTIVE" && !outlet.isTemporarilyClosed

  return (
    <Card className="dash-card border-0">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2 text-sm text-[var(--muted-foreground)]">
            <p className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-[var(--primary)]" />
              {outlet.addressLine1}{outlet.neighborhood ? `, ${outlet.neighborhood}` : ""}
            </p>
            {outlet.phone && (
              <p className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-[var(--primary)]" />{outlet.phone}
              </p>
            )}
            {outlet.email && (
              <p className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-[var(--primary)]" />{outlet.email}
              </p>
            )}
            {outlet.bio && (
              <p className="mt-3 max-w-md italic text-[var(--muted-foreground)]/80">
                &ldquo;{outlet.bio}&rdquo;
              </p>
            )}
          </div>

          <div
            className="grid grid-cols-3 gap-4 rounded-xl px-6 py-4"
            style={{ background: "color-mix(in oklch, var(--muted) 30%, transparent)" }}
          >
            <StatTile label="Meals" value={outlet._count?.meals ?? 0} />
            <StatTile
              label="Rating"
              value={
                <span className="flex items-center justify-center gap-1">
                  <Star className="size-4" style={{ fill: "var(--primary)", color: "var(--primary)" }} />
                  {outlet.ratings > 0 ? outlet.ratings.toFixed(1) : "—"}
                </span>
              }
            />
            <StatTile
              label="Status"
              value={
                <span
                  className="inline-block size-3 rounded-full"
                  style={{
                    background: isOperational ? "var(--success)" : "var(--muted-foreground)",
                    boxShadow : isOperational
                      ? "0 0 0 3px color-mix(in oklch, var(--success) 20%, transparent)"
                      : "none",
                  }}
                />
              }
            />
          </div>
        </div>

        {outlet.cuisines.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {outlet.cuisines.map(({ cuisine }) => (
              <span key={cuisine.id} className="badge-base badge-primary">
                <Utensils className="size-2.5" />{cuisine.name}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
