import { env } from "@/env"

export interface ComplianceNoticeParams {
  businessName    : string
  documentTypeName: string
  issueType       : "MISSING" | "EXPIRED" | "EXPIRING_SOON"
  severity        : "LOW" | "MEDIUM" | "CRITICAL"
  expiryDate?     : Date | null
}

const ACCENT_BY_SEVERITY: Record<ComplianceNoticeParams["severity"], string> = {
  CRITICAL: "#dc2626",
  MEDIUM  : "#d97706",
  LOW     : "#2563eb",
}

const HEADLINE_BY_TYPE: Record<ComplianceNoticeParams["issueType"], (p: ComplianceNoticeParams) => string> = {
  MISSING       : (p) => `A required document is missing: ${p.documentTypeName}`,
  EXPIRED       : (p) => `Your document has expired: ${p.documentTypeName}`,
  EXPIRING_SOON : (p) => `Your document is expiring soon: ${p.documentTypeName}`,
}

const BODY_BY_TYPE: Record<ComplianceNoticeParams["issueType"], (p: ComplianceNoticeParams) => string> = {
  MISSING: (p) =>
    `We don't yet have a copy of <strong>${escapeHtml(p.documentTypeName)}</strong> on file for ${escapeHtml(p.businessName)}. ` +
    `This document is required to remain in good standing on DailyBread — please upload it as soon as you can.`,
  EXPIRED: (p) =>
    `<strong>${escapeHtml(p.documentTypeName)}</strong> for ${escapeHtml(p.businessName)} expired` +
    (p.expiryDate ? ` on ${formatDate(p.expiryDate)}` : "") +
    `. Please upload a renewed copy to avoid any disruption to your account.`,
  EXPIRING_SOON: (p) =>
    `<strong>${escapeHtml(p.documentTypeName)}</strong> for ${escapeHtml(p.businessName)} is due to expire` +
    (p.expiryDate ? ` on ${formatDate(p.expiryDate)}` : "") +
    `. Renewing it ahead of time helps avoid any gap in your account's standing.`,
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

/*
 * A single reusable branded shell — every transactional email from this
 * backend should render through this rather than hand-rolling its own
 * <table> layout. Inline styles throughout (email clients strip <style>
 * blocks/external CSS), a single accent color as the only "branding"
 * variable so callers can signal urgency without needing their own layout.
 */
function renderShell(params: { accent: string; preheader: string; bodyHtml: string }): string {
  const dashboardUrl = env.VENDOR_DASHBOARD_URL
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(params.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:${params.accent};height:6px;line-height:6px;font-size:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <div style="font-size:20px;font-weight:700;color:#18181b;letter-spacing:-0.02em;">DailyBread</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px 32px;">
              ${params.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background-color:#fafafa;border-top:1px solid #f0f0f0;">
              <p style="margin:0 0 4px 0;font-size:12px;line-height:18px;color:#71717a;">
                Questions about this notice? Contact us at
                <a href="mailto:${env.SUPPORT_EMAIL}" style="color:${params.accent};text-decoration:none;">${env.SUPPORT_EMAIL}</a>.
              </p>
              ${dashboardUrl ? `<p style="margin:0;font-size:12px;line-height:18px;color:#71717a;">Manage your documents any time from your <a href="${dashboardUrl}" style="color:${params.accent};text-decoration:none;">vendor dashboard</a>.</p>` : ""}
              <p style="margin:12px 0 0 0;font-size:11px;line-height:16px;color:#a1a1aa;">DailyBread · This is an automated compliance notice.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildComplianceNoticeEmail(p: ComplianceNoticeParams): { subject: string; html: string; text: string } {
  const accent = ACCENT_BY_SEVERITY[p.severity]
  const headline = HEADLINE_BY_TYPE[p.issueType](p)
  const bodyText = BODY_BY_TYPE[p.issueType](p)

  const bodyHtml = `
    <h1 style="margin:0 0 12px 0;font-size:18px;line-height:26px;color:#18181b;font-weight:600;">${escapeHtml(headline)}</h1>
    <p style="margin:0 0 20px 0;font-size:14px;line-height:22px;color:#3f3f46;">${bodyText}</p>
    ${env.VENDOR_DASHBOARD_URL
      ? `<a href="${env.VENDOR_DASHBOARD_URL}" style="display:inline-block;background-color:${accent};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:11px 22px;border-radius:999px;">Go to Documents</a>`
      : ""}
  `

  return {
    subject: headline,
    html: renderShell({ accent, preheader: bodyText.replace(/<[^>]+>/g, ""), bodyHtml }),
    text: `${headline}\n\n${bodyText.replace(/<[^>]+>/g, "")}\n\nQuestions? Contact ${env.SUPPORT_EMAIL}.`,
  }
}
