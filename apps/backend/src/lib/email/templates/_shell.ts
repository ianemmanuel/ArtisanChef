import { env } from "@/env"

/*
 * The one branded email shell. Every transactional email renders through this.
 *
 * Colours are hard-coded sRGB — the oklch resolutions of the app's design
 * tokens (packages/ui/src/styles/primitives/tokens.css + globals.css). Email
 * clients can't use CSS variables, @import fonts, or external CSS, so the
 * theme is baked in here and nowhere else.
 *
 *   neutral scale ...... the app's warm-zinc neutrals
 *   brand ............... warm amber (--color-brand-*)
 *   tone accents ....... the app's semantic status tokens (success/warning/…)
 *   wordmark ........... Georgia, echoing the app's Newsreader display face
 *   pill CTA ........... --radius-full
 */

// ── palette (resolved design tokens) ─────────────────────────────────────────
const C = {
  page      : "#f4f4f5", // neutral-100
  card      : "#ffffff", // neutral-0
  footerBg  : "#fafafa", // neutral-50
  hairline  : "#ececee", // neutral-150
  border    : "#e4e4e7", // neutral-200
  ink       : "#27272a", // neutral-800  (body foreground)
  inkStrong : "#18181b", // neutral-900  (headings, wordmark)
  muted     : "#71717a", // neutral-500
  faint     : "#a1a1aa", // neutral-400
  brand     : "#c06f2c", // brand-600  (links, wordmark)
} as const

export type EmailTone = "brand" | "positive" | "warning" | "critical" | "info"

// The app's semantic status colours (--success / --warning / --info /
// --destructive), darkened one step for text-on-white contrast in email.
export const TONE_COLOR: Record<EmailTone, string> = {
  brand   : "#bf6f2c",
  positive: "#1a7f43",
  warning : "#c2831b",
  critical: "#cb2b2b",
  info    : "#2f6fd0",
}

const FONT_SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const FONT_DISPLAY = "Georgia,'Times New Roman',serif"

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "")
}

// ── body composition ─────────────────────────────────────────────────────────

export interface EmailBody {
  /** One-line headline. */
  heading   : string
  /** Lead paragraph(s). Plain text — escaped for you. */
  paragraphs: string[]
  /** Optional labelled key/value rows shown in a light panel. */
  facts?    : Array<{ label: string; value: string }>
  /** Optional bullet list. Plain text — escaped for you. */
  bullets?  : string[]
  /** Optional pill CTA. */
  cta?      : { label: string; url: string | undefined }
}

export function composeBody(b: EmailBody): string {
  const paras = b.paragraphs
    .map((p) => `<p style="margin:0 0 16px 0;font-size:14px;line-height:22px;color:${C.ink};">${escapeHtml(p)}</p>`)
    .join("")

  const facts = b.facts?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 16px 0;border:1px solid ${C.border};border-radius:10px;background-color:${C.footerBg};">
         ${b.facts.map((f, i) => `
           <tr>
             <td style="padding:9px 14px;font-size:12px;line-height:18px;color:${C.muted};width:40%;${i ? `border-top:1px solid ${C.hairline};` : ""}">${escapeHtml(f.label)}</td>
             <td style="padding:9px 14px;font-size:13px;line-height:18px;color:${C.ink};font-weight:600;${i ? `border-top:1px solid ${C.hairline};` : ""}">${escapeHtml(f.value)}</td>
           </tr>`).join("")}
       </table>`
    : ""

  const bullets = b.bullets?.length
    ? `<ul style="margin:0 0 16px 0;padding-left:20px;">
         ${b.bullets.map((x) => `<li style="margin:0 0 6px 0;font-size:14px;line-height:22px;color:${C.ink};">${escapeHtml(x)}</li>`).join("")}
       </ul>`
    : ""

  const cta = b.cta?.url
    ? `<a href="${b.cta.url}" style="display:inline-block;background-color:${C.brand};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:11px 22px;border-radius:999px;">${escapeHtml(b.cta.label)}</a>`
    : ""

  return `
    <h1 style="margin:0 0 12px 0;font-size:19px;line-height:27px;color:${C.inkStrong};font-weight:600;letter-spacing:-0.01em;">${escapeHtml(b.heading)}</h1>
    ${paras}${facts}${bullets}${cta}
  `
}

// ── shell ────────────────────────────────────────────────────────────────────

export interface EmailShellParams {
  tone      : EmailTone
  preheader : string
  bodyHtml  : string
  footerNote?  : string
  /** true → footer links to the vendor dashboard (if configured). */
  vendorFooter?: boolean
}

export function renderEmailShell(params: EmailShellParams): string {
  const accent = TONE_COLOR[params.tone]
  const dashboardUrl = env.VENDOR_DASHBOARD_URL
  const footerNote = params.footerNote ?? "DailyBread · Automated notification."
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background-color:${C.page};font-family:${FONT_SANS};">
  <span style="display:none;font-size:1px;color:${C.page};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(params.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.page};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:${C.card};border:1px solid ${C.border};border-radius:14px;overflow:hidden;">
          <tr><td style="background-color:${accent};height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:26px 32px 6px 32px;">
              <span style="font-family:${FONT_DISPLAY};font-size:21px;font-weight:700;color:${C.inkStrong};letter-spacing:-0.01em;">Daily<span style="color:${C.brand};">Bread</span></span>
            </td>
          </tr>
          <tr><td style="padding:10px 32px 30px 32px;">${params.bodyHtml}</td></tr>
          <tr>
            <td style="padding:22px 32px;background-color:${C.footerBg};border-top:1px solid ${C.hairline};">
              <p style="margin:0 0 4px 0;font-size:12px;line-height:18px;color:${C.muted};">
                Questions? Reach us at
                <a href="mailto:${env.SUPPORT_EMAIL}" style="color:${C.brand};text-decoration:none;">${env.SUPPORT_EMAIL}</a>.
              </p>
              ${params.vendorFooter && dashboardUrl ? `<p style="margin:0;font-size:12px;line-height:18px;color:${C.muted};">Manage everything from your <a href="${dashboardUrl}" style="color:${C.brand};text-decoration:none;">vendor dashboard</a>.</p>` : ""}
              <p style="margin:12px 0 0 0;font-size:11px;line-height:16px;color:${C.faint};">${escapeHtml(footerNote)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
