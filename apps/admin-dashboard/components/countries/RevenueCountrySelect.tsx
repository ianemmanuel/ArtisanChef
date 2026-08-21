"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Globe2, Loader2 } from "lucide-react"
import { Label } from "@repo/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select"

export interface RevenueCountryOption {
  slug: string
  name: string
}

interface Props {
  options : RevenueCountryOption[]
  /** Currently selected slug, or "all" for the aggregate view. */
  selected: string
  /** COUNTRY-tier admins — single option, nothing to actually switch. Keeps the control surface visually consistent across tiers. */
  locked? : boolean
}

const selectStyle  = { backgroundColor: "var(--input)", color: "var(--foreground)" }
const contentStyle = { backgroundColor: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)" }

/**
 * Scope selector for /countries/revenue — same visual language as
 * components/document-types/CountrySelect.tsx, but this one also offers
 * an "All countries (aggregate)" option since revenue can be viewed
 * platform-wide as well as per-country. Pushes `?country=<slug>` (or
 * clears it for "all") via the URL.
 */
export function RevenueCountrySelect({ options, selected, locked = false }: Props) {
  const router       = useRouter()
  const pathname      = usePathname()
  const searchParams  = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") params.delete("country")
    else params.set("country", value)
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">Scope</Label>
      <Select value={selected} onValueChange={onChange} disabled={locked}>
        <SelectTrigger className="w-64 rounded-full" style={selectStyle}>
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />}
          <SelectValue placeholder="Select scope…" />
        </SelectTrigger>
        <SelectContent className="rounded-xl" style={contentStyle}>
          {!locked && <SelectItem value="all" className="rounded-lg py-2">All countries (aggregate)</SelectItem>}
          {options.map((c) => (
            <SelectItem key={c.slug} value={c.slug} className="rounded-lg py-2">{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
