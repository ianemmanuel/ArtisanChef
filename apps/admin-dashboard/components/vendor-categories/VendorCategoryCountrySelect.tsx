"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Globe2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select"

interface Props {
  options : Array<{ slug: string; name: string }>
  selected: string
  /** searchParam key to write — defaults to "country" */
  paramKey?: string
}

/**
 * Global-scope-only country narrowing for single-focus analytics pages
 * (Adoption, Revenue) — the top-right counterpart to the country column in
 * TableFilterBar used on list pages. Country-scoped admins never see this
 * (their page is already locked to their own country server-side); this
 * only renders when the caller has more than one option to offer.
 */
export function VendorCategoryCountrySelect({ options, selected, paramKey = "country" }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") params.delete(paramKey)
    else params.set(paramKey, value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Select value={selected} onValueChange={onChange}>
      <SelectTrigger className="w-52 rounded-full" style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}>
        <Globe2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="All countries" />
      </SelectTrigger>
      <SelectContent className="rounded-xl" style={{ backgroundColor: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)" }}>
        <SelectItem value="all" className="rounded-lg">All Countries</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.slug} value={o.slug} className="rounded-lg">{o.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
