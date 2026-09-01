import { env } from "@/env"
import { renderEmailShell, composeBody, formatDate, type EmailTone } from "./_shell"

/*
 * Outlet-document compliance emails — vendor-facing. One builder, four kinds:
 *   EXPIRING      — a document is approaching its expiry date (reminder)
 *   EXPIRED_GRACE — it expired; still in the grace window, act now
 *   SUSPENDED     — CRITICAL doc expired past grace, outlet taken offline
 *   RESOLVED      — renewed document approved, outlet is live again
 */

export type OutletComplianceKind = "EXPIRING" | "EXPIRED_GRACE" | "SUSPENDED" | "RESOLVED"

export interface OutletComplianceParams {
  outletName      : string
  documentTypeName: string
  kind            : OutletComplianceKind
  severity        : "LOW" | "MEDIUM" | "CRITICAL"
  expiryDate?     : Date | null
  daysOut?        : number | null
  graceEndsAt?    : Date | null
}

const TONE: Record<OutletComplianceKind, EmailTone> = {
  EXPIRING     : "warning",
  EXPIRED_GRACE: "critical",
  SUSPENDED    : "critical",
  RESOLVED     : "positive",
}

export function buildOutletComplianceEmail(p: OutletComplianceParams): { subject: string; html: string; text: string } {
  const doc = p.documentTypeName
  const outlet = p.outletName
  const gates = p.severity === "CRITICAL"

  let heading: string
  let paragraphs: string[]

  if (p.kind === "RESOLVED") {
    heading = `${outlet} is live again`
    paragraphs = [`${doc} for your outlet "${outlet}" has been approved. The outlet is back online and can take orders.`]
  } else if (p.kind === "SUSPENDED") {
    heading = `${outlet} has been taken offline`
    paragraphs = [
      `${doc} for your outlet "${outlet}" expired${p.expiryDate ? ` on ${formatDate(p.expiryDate)}` : ""} and the grace period has passed.`,
      `Because this document is required to operate, the outlet has been automatically suspended and is not taking orders. Upload a current version under Documents — the outlet comes back online as soon as it's approved.`,
    ]
  } else if (p.kind === "EXPIRED_GRACE") {
    heading = `Action needed: ${doc} for ${outlet} has expired`
    paragraphs = [
      `${doc} for your outlet "${outlet}" expired${p.expiryDate ? ` on ${formatDate(p.expiryDate)}` : ""}.`,
      gates
        ? `This document is required to operate. ${p.graceEndsAt ? `If a current version isn't approved by ${formatDate(p.graceEndsAt)}, the outlet will be taken offline automatically.` : "The outlet will be taken offline automatically if it isn't renewed soon."}`
        : `Please upload a renewed copy under Documents to keep your account in good standing.`,
    ]
  } else {
    const inDays = p.daysOut != null && p.daysOut > 0 ? ` in ${p.daysOut} day${p.daysOut === 1 ? "" : "s"}` : " very soon"
    heading = `${doc} for ${outlet} expires${inDays}`
    paragraphs = [
      `${doc} for your outlet "${outlet}" expires${p.expiryDate ? ` on ${formatDate(p.expiryDate)}` : inDays}.`,
      gates
        ? `This document is required for the outlet to operate. Renew it ahead of time to avoid any interruption.`
        : `Renewing it ahead of time avoids any gap in your account's standing.`,
    ]
  }

  const facts: Array<{ label: string; value: string }> = [
    { label: "Outlet", value: outlet },
    { label: "Document", value: doc },
  ]
  if (p.expiryDate) facts.push({ label: p.kind === "EXPIRING" ? "Expires" : "Expired", value: formatDate(p.expiryDate) })

  return {
    subject: heading,
    html: renderEmailShell({
      tone: TONE[p.kind],
      preheader: paragraphs[0] ?? heading,
      bodyHtml: composeBody({
        heading,
        paragraphs,
        facts,
        cta: p.kind === "RESOLVED" ? undefined : { label: "Go to Documents", url: env.VENDOR_DASHBOARD_URL },
      }),
      footerNote: "DailyBread · Automated outlet compliance notice.",
      vendorFooter: true,
    }),
    text: `${heading}\n\n${paragraphs.join("\n\n")}\n\nQuestions? Contact ${env.SUPPORT_EMAIL}.`,
  }
}
