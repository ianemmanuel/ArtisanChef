import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

/*
 * Server-rendered pagination for any server-paginated list page.
 *
 * Deliberately link-based, not a client component: every list here is an SSR
 * page reading `searchParams`, so a plain <Link> is all a page change needs —
 * no router, no state, no JS shipped. `buildHref` keeps the page's other
 * filters in the query string, since only the caller knows what they are.
 */

interface Props {
  page      : number
  pageSize  : number
  total     : number
  buildHref : (page: number) => string
  /** Plural noun for the count line, e.g. "outlets". */
  label?: string
}

export function ListPagination({ page, pageSize, total, buildHref, label = "results" }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  const link = "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-[var(--muted)]"
  const dead = "pointer-events-none opacity-40"

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--muted-foreground)]">
        Showing {from}–{to} of {total} {label}
      </p>

      <div className="flex items-center gap-2">
        <Link
          href={buildHref(page - 1)}
          aria-disabled={page <= 1}
          className={`${link} ${page <= 1 ? dead : ""}`}
          style={{ borderColor: "var(--border)" }}
        >
          <ChevronLeft className="size-4" />Previous
        </Link>
        <span className="text-sm text-[var(--muted-foreground)]">
          Page {page} of {totalPages}
        </span>
        <Link
          href={buildHref(page + 1)}
          aria-disabled={page >= totalPages}
          className={`${link} ${page >= totalPages ? dead : ""}`}
          style={{ borderColor: "var(--border)" }}
        >
          Next<ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  )
}
