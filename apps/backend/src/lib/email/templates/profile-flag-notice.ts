import { env } from "@/env"
import { renderEmailShell, composeBody } from "./_shell"

/*
 * Admin-facing: a vendor public profile was just auto-flagged and is waiting
 * in the moderation queue. Fired at flag time (create or edit), separate from
 * the 24h "still unreviewed" stale nudge.
 */

export interface ProfileFlagEmailParams {
  vendorName : string
  displayName: string
  reasons    : string[]          // human-readable, e.g. "Possible impersonation of McDonald's"
  context    : "created" | "updated"
}

export function buildProfileFlagEmail(p: ProfileFlagEmailParams): { subject: string; html: string; text: string } {
  const heading = `Profile flagged for review — ${p.vendorName}`
  const paragraphs = [
    `${p.vendorName} ${p.context === "created" ? "created" : "edited"} their public profile ("${p.displayName}") and it was automatically flagged by the content checks.`,
    `It can't be published until a moderator reviews it.`,
  ]
  const facts = [
    { label: "Vendor", value: p.vendorName },
    { label: "Display name", value: p.displayName },
    { label: "Flags", value: p.reasons.join("; ") },
  ]

  return {
    subject: heading,
    html: renderEmailShell({
      tone: "warning",
      preheader: paragraphs[0] ?? heading,
      bodyHtml: composeBody({
        heading,
        paragraphs,
        facts,
        cta: env.ADMIN_DASHBOARD_URL
          ? { label: "Open the moderation queue", url: `${env.ADMIN_DASHBOARD_URL}/vendors/profiles` }
          : undefined,
      }),
      footerNote: "DailyBread · Automated profile moderation.",
    }),
    text: `${heading}\n\n${paragraphs.join("\n\n")}\n\nFlags: ${p.reasons.join("; ")}`,
  }
}
