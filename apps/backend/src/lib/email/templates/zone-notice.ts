import { env } from "@/env"
import { renderEmailShell, composeBody, formatDate, type EmailTone } from "./_shell"

/*
 * Zone-change notifications — one place owns every bit of human phrasing for
 * "an operational zone changed", used for both the in-app notification rows
 * and the vendor / admin emails. See admin.zone.notification.service.ts.
 */

type OpStatus = "ACTIVE" | "SUSPENDED" | "MAINTENANCE" | "EMERGENCY"
type Level = "REGISTRATION_ONLY" | "MARKETPLACE" | "PLATFORM_DELIVERY" | "FULL_OPERATIONS"

export type ZoneChangeDescriptor =
  | { kind: "OPERATIONAL_STATUS"; from: OpStatus; to: OpStatus; reason: string | null; pausedUntil: Date | null }
  | { kind: "LEVEL"; from: Level; to: Level; reason: string }
  | { kind: "LIFECYCLE"; to: "RETIRED" | "REACTIVATED" }

const LEVEL_LABEL: Record<Level, string> = {
  REGISTRATION_ONLY: "Registration only",
  MARKETPLACE      : "Marketplace",
  PLATFORM_DELIVERY: "Platform delivery",
  FULL_OPERATIONS  : "Full operations",
}
const LEVEL_RANK: Record<Level, number> = {
  REGISTRATION_ONLY: 0, MARKETPLACE: 1, PLATFORM_DELIVERY: 2, FULL_OPERATIONS: 3,
}
const STATUS_LABEL: Record<OpStatus, string> = {
  ACTIVE: "active", SUSPENDED: "suspended", MAINTENANCE: "under maintenance", EMERGENCY: "in an emergency stop",
}

export function zoneChangeTone(c: ZoneChangeDescriptor): EmailTone {
  if (c.kind === "OPERATIONAL_STATUS") {
    if (c.to === "ACTIVE") return "positive"
    if (c.to === "MAINTENANCE") return "warning"
    return "critical"
  }
  if (c.kind === "LEVEL") return LEVEL_RANK[c.to] > LEVEL_RANK[c.from] ? "positive" : "warning"
  return c.to === "REACTIVATED" ? "positive" : "brand"
}

export interface ZoneContext {
  cityName: string
  zoneName: string
}

// ─── Vendor-facing wording ────────────────────────────────────────────────────

export function zoneChangeVendorSummary(c: ZoneChangeDescriptor, ctx: ZoneContext): { headline: string; body: string } {
  const where = `${ctx.zoneName}, ${ctx.cityName}`

  if (c.kind === "LIFECYCLE") {
    return c.to === "RETIRED"
      ? {
          headline: `Zone retired: ${where}`,
          body: `The ${ctx.zoneName} zone in ${ctx.cityName} has been retired. Your outlet stays registered — it now falls under whichever active zone covers its location (or registration-only if none does). What you can sell there may change as a result.`,
        }
      : {
          headline: `Zone reactivated: ${where}`,
          body: `The ${ctx.zoneName} zone in ${ctx.cityName} is active again. Your outlet's available services there return to that zone's level.`,
        }
  }

  if (c.kind === "LEVEL") {
    const up = LEVEL_RANK[c.to] > LEVEL_RANK[c.from]
    return up
      ? {
          headline: `New capabilities in ${where}`,
          body: `${ctx.zoneName} in ${ctx.cityName} has been promoted to ${LEVEL_LABEL[c.to]}. ${levelGain(c.to)} This applies to your outlet in this zone.`,
        }
      : {
          headline: `Service change in ${where}`,
          body: `${ctx.zoneName} in ${ctx.cityName} has been moved to ${LEVEL_LABEL[c.to]}. ${levelLoss(c.from, c.to)} Your outlet in this zone is affected.`,
        }
  }

  if (c.to === "ACTIVE") {
    return {
      headline: `Operations resumed in ${where}`,
      body: `${ctx.zoneName} in ${ctx.cityName} is running normally again. New orders and deliveries have resumed for your outlet there.`,
    }
  }
  const resumeLine = c.pausedUntil ? ` Operations are expected to resume around ${formatDate(c.pausedUntil)}.` : ""
  const reasonLine = c.reason ? ` Reason: ${c.reason}` : ""
  const verb = c.to === "MAINTENANCE" ? "is under planned maintenance" : "has been paused"
  return {
    headline: c.to === "MAINTENANCE" ? `Planned maintenance in ${where}` : `Ordering paused in ${where}`,
    body: `${ctx.zoneName} in ${ctx.cityName} ${verb}. New orders and platform deliveries are on hold for your outlet there; your outlet and any meal plans remain registered.${resumeLine}${reasonLine}`,
  }
}

function levelGain(to: Level): string {
  switch (to) {
    case "MARKETPLACE"      : return "You can now list on-demand meals and deliver them yourself."
    case "PLATFORM_DELIVERY": return "Platform delivery is now available for on-demand orders, on top of self-delivery."
    case "FULL_OPERATIONS"  : return "Meal plans are now available here, delivered by DailyBread."
    default                 : return ""
  }
}
function levelLoss(from: Level, to: Level): string {
  if (LEVEL_RANK[from] >= LEVEL_RANK.FULL_OPERATIONS && LEVEL_RANK[to] < LEVEL_RANK.FULL_OPERATIONS) {
    return "Meal plans are no longer offered in this zone; existing plans will be wound down per your agreement."
  }
  if (LEVEL_RANK[from] >= LEVEL_RANK.PLATFORM_DELIVERY && LEVEL_RANK[to] < LEVEL_RANK.PLATFORM_DELIVERY) {
    return "Platform delivery is no longer available here — on-demand orders switch to vendor self-delivery."
  }
  return "On-demand ordering is no longer available in this zone."
}

// ─── Admin-facing wording ─────────────────────────────────────────────────────

export interface ZoneAdminContext extends ZoneContext {
  vendorCount: number
  outletCount: number
}

export function zoneChangeAdminSummary(c: ZoneChangeDescriptor, ctx: ZoneAdminContext): { headline: string; body: string } {
  const scope = `${ctx.vendorCount} vendor${ctx.vendorCount === 1 ? "" : "s"} (${ctx.outletCount} outlet${ctx.outletCount === 1 ? "" : "s"})`

  if (c.kind === "LIFECYCLE") {
    return {
      headline: `Zone ${c.to === "RETIRED" ? "retired" : "reactivated"}: ${ctx.zoneName}, ${ctx.cityName}`,
      body: `${ctx.zoneName} in ${ctx.cityName} was ${c.to === "RETIRED" ? "retired" : "reactivated"}. ${scope} in the zone ${c.to === "RETIRED" ? "were" : "are"} affected.`,
    }
  }
  if (c.kind === "LEVEL") {
    return {
      headline: `Zone level changed: ${ctx.zoneName}, ${ctx.cityName}`,
      body: `${ctx.zoneName} in ${ctx.cityName} moved from ${LEVEL_LABEL[c.from]} to ${LEVEL_LABEL[c.to]}. ${scope} affected. Reason: ${c.reason}`,
    }
  }
  const detail = c.to === "ACTIVE"
    ? "resumed normal operations"
    : `set to ${STATUS_LABEL[c.to]}${c.pausedUntil ? ` until ${formatDate(c.pausedUntil)}` : ""}`
  return {
    headline: `Zone ${c.to === "ACTIVE" ? "resumed" : "paused"}: ${ctx.zoneName}, ${ctx.cityName}`,
    body: `${ctx.zoneName} in ${ctx.cityName} ${detail}. ${scope} affected.${c.reason ? ` Reason: ${c.reason}` : ""}`,
  }
}

// ─── Email builders ───────────────────────────────────────────────────────────

function facts(c: ZoneChangeDescriptor, ctx: ZoneContext): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [
    { label: "City", value: ctx.cityName },
    { label: "Zone", value: ctx.zoneName },
  ]
  if (c.kind === "LEVEL") rows.push({ label: "Level", value: `${LEVEL_LABEL[c.from]} → ${LEVEL_LABEL[c.to]}` })
  if (c.kind === "OPERATIONAL_STATUS") {
    rows.push({ label: "Status", value: c.to === "ACTIVE" ? "Active" : STATUS_LABEL[c.to].replace(/^\w/, (m) => m.toUpperCase()) })
    if (c.pausedUntil) rows.push({ label: "Expected resume", value: formatDate(c.pausedUntil) })
  }
  return rows
}

export function buildZoneVendorEmail(
  c: ZoneChangeDescriptor,
  ctx: ZoneContext,
): { subject: string; html: string; text: string } {
  const { headline, body } = zoneChangeVendorSummary(c, ctx)
  return {
    subject: headline,
    html: renderEmailShell({
      tone: zoneChangeTone(c),
      preheader: body,
      bodyHtml: composeBody({
        heading: headline,
        paragraphs: [body],
        facts: facts(c, ctx),
        cta: { label: "Open vendor dashboard", url: env.VENDOR_DASHBOARD_URL },
      }),
      footerNote: "DailyBread · Automated operations notice.",
      vendorFooter: true,
    }),
    text: `${headline}\n\n${body}\n\nQuestions? Contact ${env.SUPPORT_EMAIL}.`,
  }
}

export function buildZoneAdminEmail(
  c: ZoneChangeDescriptor,
  ctx: ZoneAdminContext,
  citySlug: string,
): { subject: string; html: string; text: string } {
  const { headline, body } = zoneChangeAdminSummary(c, ctx)
  const link = env.ADMIN_DASHBOARD_URL ? `${env.ADMIN_DASHBOARD_URL}/cities/${citySlug}/geography` : undefined
  return {
    subject: headline,
    html: renderEmailShell({
      tone: zoneChangeTone(c),
      preheader: body,
      bodyHtml: composeBody({
        heading: headline,
        paragraphs: [body],
        facts: [
          ...facts(c, ctx),
          { label: "Affected", value: `${ctx.vendorCount} vendor${ctx.vendorCount === 1 ? "" : "s"} · ${ctx.outletCount} outlet${ctx.outletCount === 1 ? "" : "s"}` },
        ],
        cta: { label: "View zone configuration", url: link },
      }),
      footerNote: "DailyBread · Automated alert for admins with zone oversight in this market.",
    }),
    text: `${headline}\n\n${body}${link ? `\n\n${link}` : ""}`,
  }
}
