"use client"

import { useMemo, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Globe2, Loader2, Check, ChevronsUpDown } from "lucide-react"
import { Label } from "@repo/ui/components/label"
import { Button } from "@repo/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/components/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover"
import { cn } from "@repo/ui/lib/utils"

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

const triggerStyle = { backgroundColor: "var(--input)", color: "var(--foreground)" }
const contentStyle = { backgroundColor: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)" }

/**
 * Scope selector for /countries/revenue, /vendor-categories/revenue and
 * /vendors/revenue — a searchable Command+Popover combobox (same pattern as
 * TableFilterBar's SearchableComboField), with an "All countries
 * (aggregate)" option since revenue can be viewed platform-wide as well as
 * per-country. Pushes `?country=<slug>` (or clears it for "all") via the URL.
 */
export function RevenueCountrySelect({ options, selected, locked = false }: Props) {
  const router       = useRouter()
  const pathname      = usePathname()
  const searchParams  = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const selectedLabel = useMemo(() => {
    if (selected === "all") return "All countries (aggregate)"
    return options.find((o) => o.slug === selected)?.name ?? "All countries (aggregate)"
  }, [options, selected])

  function onChange(value: string) {
    setOpen(false)
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") params.delete("country")
    else params.set("country", value)
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  return (
    <div className="w-full space-y-1.5 sm:w-64">
      <Label className="text-xs font-medium text-muted-foreground">Scope</Label>
      <Popover open={open} onOpenChange={(o) => !locked && setOpen(o)}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={locked}
            className="w-full justify-between rounded-full font-normal"
            style={triggerStyle}
          >
            <span className="flex min-w-0 items-center gap-2">
              {isPending ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <Globe2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              <span className="truncate">{selectedLabel}</span>
            </span>
            {!locked && <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] rounded-xl p-0" style={contentStyle} align="start">
          <Command style={{ backgroundColor: "var(--popover)" }}>
            <CommandInput placeholder="Search countries…" className="h-9 text-sm" style={{ color: "var(--popover-foreground)" }} />
            <CommandList>
              <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">No country found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="All countries (aggregate)"
                  onSelect={() => onChange("all")}
                  className="cursor-pointer"
                  style={{ color: "var(--popover-foreground)" }}
                >
                  <Check className={cn("h-4 w-4 shrink-0 text-primary", selected === "all" ? "opacity-100" : "opacity-0")} />
                  All countries (aggregate)
                </CommandItem>
                {options.map((c) => (
                  <CommandItem
                    key={c.slug}
                    value={c.name}
                    onSelect={() => onChange(c.slug)}
                    className="cursor-pointer"
                    style={{ color: "var(--popover-foreground)" }}
                  >
                    <Check className={cn("h-4 w-4 shrink-0 text-primary", selected === c.slug ? "opacity-100" : "opacity-0")} />
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
