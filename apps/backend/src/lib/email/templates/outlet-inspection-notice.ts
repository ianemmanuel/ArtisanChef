import { env } from "@/env"
import { renderEmailShell, composeBody, formatDate, type EmailTone } from "./_shell"

/*
 * Outlet premises-inspection emails — vendor-facing. One builder, four kinds:
 *   SCHEDULED — a visit has been booked (carries the date)
 *   PASSED    — the outlet passed; meal-plan eligibility unlocked
 *   FAILED    — the outlet failed; carries the specific reasons
 *   CANCELLED — a booked visit was called off
 */

export type OutletInspectionKind = "SCHEDULED" | "PASSED" | "FAILED" | "CANCELLED"

export interface OutletInspectionParams {
  outletName    : string
  kind          : OutletInspectionKind
  scheduledFor? : Date | null
  validUntil?   : Date | null
  failureReasons?: string[]
  findings?     : string | null
}

const TONE: Record<OutletInspectionKind, EmailTone> = {
  SCHEDULED: "info",
  PASSED   : "positive",
  FAILED   : "critical",
  CANCELLED: "warning",
}

export function buildOutletInspectionEmail(p: OutletInspectionParams): { subject: string; html: string; text: string } {
  const outlet = p.outletName
  let heading: string
  let paragraphs: string[]

  if (p.kind === "SCHEDULED") {
    heading = `Premises inspection booked for ${outlet}`
    paragraphs = [
      `A physical inspection of your outlet "${outlet}" has been scheduled${p.scheduledFor ? ` for ${formatDate(p.scheduledFor)}` : ""}.`,
      `An inspection is required before this outlet can offer meal plans. Please make sure the premises are ready and someone is available to receive the inspector.`,
    ]
  } else if (p.kind === "PASSED") {
    heading = `${outlet} passed its inspection`
    paragraphs = [
      `Your outlet "${outlet}" has passed its premises inspection.`,
      p.validUntil
        ? `This clearance is valid until ${formatDate(p.validUntil)}, after which a re-inspection will be needed.`
        : `The outlet is now cleared for meal-plan eligibility, subject to the usual zone and document requirements.`,
    ]
  } else if (p.kind === "FAILED") {
    heading = `Action needed: ${outlet} did not pass inspection`
    paragraphs = [
      `Your outlet "${outlet}" did not pass its premises inspection.`,
      p.failureReasons && p.failureReasons.length > 0
        ? `Reasons: ${p.failureReasons.join("; ")}.`
        : `Please review the inspector's notes in your dashboard.`,
      `Address the items above and contact support to arrange a re-inspection.`,
    ]
  } else {
    heading = `Inspection for ${outlet} cancelled`
    paragraphs = [
      `The premises inspection previously scheduled for your outlet "${outlet}" has been cancelled.`,
      `We'll be in touch if a new date is arranged.`,
    ]
  }

  const facts: Array<{ label: string; value: string }> = [{ label: "Outlet", value: outlet }]
  if (p.kind === "SCHEDULED" && p.scheduledFor) facts.push({ label: "Scheduled", value: formatDate(p.scheduledFor) })
  if (p.kind === "PASSED" && p.validUntil) facts.push({ label: "Valid until", value: formatDate(p.validUntil) })

  return {
    subject: heading,
    html: renderEmailShell({
      tone: TONE[p.kind],
      preheader: paragraphs[0] ?? heading,
      bodyHtml: composeBody({
        heading,
        paragraphs,
        facts,
        cta: { label: "Open your dashboard", url: env.VENDOR_DASHBOARD_URL },
      }),
      footerNote: "DailyBread · Outlet inspection notice.",
      vendorFooter: true,
    }),
    text: `${heading}\n\n${paragraphs.join("\n\n")}\n\nQuestions? Contact ${env.SUPPORT_EMAIL}.`,
  }
}
