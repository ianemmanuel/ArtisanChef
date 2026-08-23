import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table"
import { adminFetch, ApiCallError } from "@/lib/api"
import { getAdminSession }     from "@/lib/auth/session"
import { getInitials }         from "@/lib/initials"
import { DocumentsSection }    from "@/components/vendors/DocumentsSection"
import { VendorAccountActions } from "@/components/vendors/VendorAccountActions"
import { AdminPermissions } from "@repo/types/admin-app"

export const metadata: Metadata = { title: "Vendor Account" }

interface Props { params: Promise<{ id: string }> }

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    ACTIVE   : "badge-success",
    SUSPENDED: "badge-warning",
    BANNED   : "badge-danger",
  }
  const label: Record<string, string> = {
    ACTIVE   : "Active",
    SUSPENDED: "Suspended",
    BANNED   : "Banned",
  }
  return <span className={cls[status] ?? "badge-neutral"}>{label[status] ?? status}</span>
}

export default async function VendorAccountDetailPage({ params }: Props) {
  const { id }    = await params
  const session   = await getAdminSession()

  if (!session.permissions.includes(AdminPermissions.VENDORS_ACCOUNTS_READ)) redirect("/vendors")

  let account: any
  try {
    account = await adminFetch(`/admin/v1/vendors/accounts/${id}`, {
      next: { revalidate: 60, tags: [`vendor-account-${id}`] },
    })
  } catch (err) {
    if (err instanceof ApiCallError && err.status === 404) notFound()
    throw err
  }

  const canSuspend   = session.permissions.includes(AdminPermissions.VENDORS_ACCOUNTS_SUSPEND)
  const canReinstate = session.permissions.includes(AdminPermissions.VENDORS_ACCOUNTS_REINSTATE)
  const canBan       = session.permissions.includes(AdminPermissions.VENDORS_ACCOUNTS_BAN)
  const isBanned     = account.user?.isBanned ?? false
  const ownerName   = `${account.ownerFirstName ?? ""} ${account.ownerLastName ?? ""}`.trim() || "—"

  const businessFields: [string, string][] = [
    ["Business phone", account.businessPhone ?? "—"],
    ["Reg. number",    account.companyRegNumber ?? "—"],
    ["Tax ID",         account.taxRegistrationNumber ?? "—"],
    ["Address",        account.businessAddress ?? "—"],
  ]

  const ownerFields: [string, string][] = [
    ["Owner",       ownerName],
    ["Owner email", account.ownerEmail ?? "—"],
    ["Owner phone", account.ownerPhone ?? "—"],
  ]

  return (
    <div className="page-content animate-slide-up">

      <Link
        href="/vendors/accounts"
        className="group inline-flex w-fit items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card shadow-[var(--shadow-xs)] transition-all group-hover:-translate-x-0.5 group-hover:border-primary/40 group-hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
        </span>
        Back to Accounts
      </Link>

      {/* Header card */}
      <div className="admin-card flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="avatar-circle h-14 w-14 shrink-0 text-lg">
            {getInitials(account.legalBusinessName)}
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">
              {account.legalBusinessName}
            </h1>
            <p className="text-sm text-muted-foreground">{account.businessEmail}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={isBanned ? "BANNED" : account.status} />
              {account.vendorType?.name && <span className="badge-neutral">{account.vendorType.name}</span>}
              {account.country?.name && <span className="badge-neutral">{account.country.name}</span>}
              <span className="badge-neutral">
                {account._count?.outlets ?? 0} outlet{(account._count?.outlets ?? 0) === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="text-left sm:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Joined</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              {new Date(account.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
            </p>
          </div>
          <VendorAccountActions
            vendorId={id}
            currentStatus={account.status}
            isBanned={isBanned}
            canSuspend={canSuspend}
            canReinstate={canReinstate}
            canBan={canBan}
          />
        </div>
      </div>

      {/* Ban notice — identity-level, takes precedence over suspension */}
      {isBanned && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive-bg px-5 py-4">
          <p className="text-sm font-semibold text-destructive">Banned</p>
          <p className="mt-0.5 text-sm text-foreground">{account.user?.banReason ?? "No reason on record"}</p>
          {account.user?.bannedAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Since {new Date(account.user.bannedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Suspension notice */}
      {!isBanned && account.suspensionReason && account.status !== "ACTIVE" && (
        <div className="rounded-2xl border border-warning/30 bg-warning-bg px-5 py-4">
          <p className="text-sm font-semibold text-warning">Suspended</p>
          <p className="mt-0.5 text-sm text-foreground">{account.suspensionReason}</p>
          {account.suspendedAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Since {new Date(account.suspendedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Business + owner details */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="admin-card space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Business Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {businessFields.map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-sm text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Owner &amp; Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {ownerFields.map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-sm text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Outlets */}
      {account.outlets?.length > 0 && (
        <div className="admin-card overflow-hidden p-0">
          <div className="border-b border-border/60 px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Outlets ({account.outlets.length})
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs uppercase tracking-wide">Name</TableHead>
                <TableHead className="hidden text-xs uppercase tracking-wide sm:table-cell">City</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {account.outlets.map((outlet: any) => (
                <TableRow key={outlet.id} className="hover:bg-muted/10">
                  <TableCell className="font-medium text-foreground">{outlet.name}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {outlet.city?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span className={outlet.adminStatus === "ACTIVE" ? "badge-success" : "badge-warning"}>
                      {outlet.adminStatus === "ACTIVE" ? "Active" : outlet.adminStatus}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/*
        Documents — uses DocumentsSection (same component as application review).
        Read-only here: canActOnDocuments=false hides approve/reject, so
        statusMap is just a static snapshot of what the backend returned,
        not live-tracked state. applicationId is passed as the vendorId —
        DocumentRow only uses it for the doc-id-based view signed-url route.
      */}
      {account.documents?.length > 0 && (
        <DocumentsSection
          docs={account.documents}
          applicationId={id}
          canActOnDocuments={false}
          statusMap={Object.fromEntries(account.documents.map((d: { id: string; status: string }) => [d.id, d.status]))}
        />
      )}

    </div>
  )
}