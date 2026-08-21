import Link from "next/link"
import { Store } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table"
import { Button } from "@repo/ui/components/button"
import { EmptyState } from "@/components/shared/EmptyState"
import { TablePagination } from "@/components/shared/TablePagination"
import { getInitials } from "@/lib/initials"
import type { VendorListResult } from "@/types"

interface Props {
  result      : VendorListResult | null
  page        : string
  search      : string
  status      : string
  vendorTypeId: string
}

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

/**
 * Same shape as /vendors/accounts's table, minus the Type column — it's
 * implied by the page context (already scoped to one vendor type via the
 * URL) — see components/vendors/VendorAccountsTable.tsx for the unscoped version.
 */
export function VendorTypeVendorAccountsTable({ result, page, search, status, vendorTypeId }: Props) {
  if (!result || result.accounts.length === 0) {
    return (
      <EmptyState
        icon={Store}
        title="No vendor accounts found"
        description="Try adjusting your search or filter criteria."
      />
    )
  }

  return (
    <div className="admin-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="text-xs uppercase tracking-wide">Business</TableHead>
              <TableHead className="hidden text-xs uppercase tracking-wide sm:table-cell">Country</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
              <TableHead className="hidden text-xs uppercase tracking-wide lg:table-cell">Joined</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.accounts.map((acc) => (
              <TableRow key={acc.id} className="hover:bg-muted/10">
                <TableCell>
                  <Link href={`/vendors/accounts/${acc.id}`} className="group flex items-center gap-3">
                    <div className="avatar-circle h-9 w-9 text-xs">
                      {getInitials(acc.legalBusinessName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground transition-colors group-hover:text-primary">
                        {acc.legalBusinessName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{acc.businessEmail}</p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                  {acc.country?.name ?? "—"}
                </TableCell>
                <TableCell><StatusBadge status={acc.status} /></TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className="font-mono text-xs text-muted-foreground">
                    {new Date(acc.createdAt).toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm" className="rounded-full">
                    <Link href={`/vendors/accounts/${acc.id}`}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        total={result.total}
        page={page}
        totalPages={result.totalPages}
        basePath={`/vendors/vendor-types/${vendorTypeId}/vendors`}
        params={{
          ...(search ? { search } : {}),
          ...(status ? { status } : {}),
        }}
        itemLabel="vendors"
      />
    </div>
  )
}
