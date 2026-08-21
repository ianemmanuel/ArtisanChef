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
import type { CountryLite } from "@/types/vendor-type.types"

interface Props {
  countries     : CountryLite[]
  selectedSlug  : string
}

/**
 * Document types are country-scoped by backend design — there's no
 * "all countries" view. Switching country here drives a `?country=slug`
 * query param the list page resolves to a countryId server-side.
 */
export function CountrySelect({ countries, selectedSlug }: Props) {
  const router      = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function onChange(slug: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("country", slug)
    params.set("page", "1")
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">Country</Label>
      <Select value={selectedSlug} onValueChange={onChange}>
        <SelectTrigger className="w-56 rounded-full" style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}>
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />}
          <SelectValue placeholder="Select a country…" />
        </SelectTrigger>
        <SelectContent className="rounded-xl" style={{ backgroundColor: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)" }}>
          {countries.map((c) => (
            <SelectItem key={c.id} value={c.slug} className="rounded-lg py-2">{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
