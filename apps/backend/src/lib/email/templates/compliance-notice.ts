import { env } from "@/env"
import { renderEmailShell, composeBody, formatDate, stripTags, type EmailTone } from "./_shell"

export interface ComplianceNoticeParams {
  businessName    : string
  documentTypeName: string
  issueType       : "MISSING" | "EXPIRED" | "EXPIRING_SOON"
  severity        : "LOW" | "MEDIUM" | "CRITICAL"
  expiryDate?     : Date | null
}

const TONE_BY_SEVERITY: Record<ComplianceNoticeParams["severity"], EmailTone> = {
  CRITICAL: "critical",
  MEDIUM  : "warning",
  LOW     : "info",
}

const HEADLINE: Record<ComplianceNoticeParams["issueType"], (p: ComplianceNoticeParams) => string> = {
  MISSING       : (p) => `A required document is missing: ${p.documentTypeName}`,
  EXPIRED       : (p) => `Your document has expired: ${p.documentTypeName}`,
  EXPIRING_SOON : (p) => `Your document is expiring soon: ${p.documentTypeName}`,
}

const BODY: Record<ComplianceNoticeParams["issueType"], (p: ComplianceNoticeParams) => string> = {
  MISSING: (p) =>
    `We don't yet have a copy of ${p.documentTypeName} on file for ${p.businessName}. This document is required to stay in good standing on DailyBread — please upload it as soon as you can.`,
  EXPIRED: (p) =>
    `${p.documentTypeName} for ${p.businessName} expired${p.expiryDate ? ` on ${formatDate(p.expiryDate)}` : ""}. Please upload a renewed copy to avoid any disruption to your account.`,
  EXPIRING_SOON: (p) =>
    `${p.documentTypeName} for ${p.businessName} is due to expire${p.expiryDate ? ` on ${formatDate(p.expiryDate)}` : ""}. Renewing it ahead of time avoids any gap in your account's standing.`,
}

export function buildComplianceNoticeEmail(p: ComplianceNoticeParams): { subject: string; html: string; text: string } {
  const tone = TONE_BY_SEVERITY[p.severity]
  const heading = HEADLINE[p.issueType](p)
  const body = BODY[p.issueType](p)

  return {
    subject: heading,
    html: renderEmailShell({
      tone,
      preheader: body,
      bodyHtml: composeBody({
        heading,
        paragraphs: [body],
        cta: { label: "Go to Documents", url: env.VENDOR_DASHBOARD_URL },
      }),
      footerNote: "DailyBread · Automated compliance notice.",
      vendorFooter: true,
    }),
    text: `${heading}\n\n${stripTags(body)}\n\nQuestions? Contact ${env.SUPPORT_EMAIL}.`,
  }
}
