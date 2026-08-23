"use client"

import { useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Search, SlidersHorizontal, X, Loader2, ArrowDownAZ, ArrowDownUp, Check, ChevronsUpDown, Globe2 } from "lucide-react"
import { Input }         from "@repo/ui/components/input"
import { Button }        from "@repo/ui/components/button"
import { Label }         from "@repo/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select"
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

export interface FilterStatusOption {
  value: string
  label: string
  /** Tailwind bg-* class for the leading status dot, e.g. "bg-success" */
  dot?: string
}

export interface FilterSelectOption {
  value: string
  label: string
}

export interface FilterSortOption {
  value: string
  label: string
  icon?: "az" | "updown"
}

interface Props {
  showSearch?: boolean
  searchPlaceholder?: string
  defaultSearch?: string

  statusLabel?: string
  statusOptions?: FilterStatusOption[]
  defaultStatus?: string

  countryLabel?: string
  countryOptions?: FilterSelectOption[]
  defaultCountry?: string

  sortOptions?: FilterSortOption[]
  defaultSort?: string
  defaultDir?: string

  showDateRange?: boolean
  dateRangeLabel?: string
  defaultDateFrom?: string
  defaultDateTo?: string
}

const selectStyle = {
  backgroundColor: "var(--input)",
  color          : "var(--foreground)",
}

const contentStyle = {
  backgroundColor: "var(--popover)",
  color          : "var(--popover-foreground)",
  border         : "1px solid var(--border)",
}

function StatusDot({ className }: { className: string }) {
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${className}`} aria-hidden="true" />
}

/**
 * Config-driven port of the vendor-applications filter bar — every table's
 * filter UI should render through this instead of hand-rolling another
 * copy. Renders only the fields it's given a config for.
 */
export function TableFilterBar({
  showSearch = true,
  searchPlaceholder = "Search…",
  defaultSearch = "",
  statusLabel = "Status",
  statusOptions,
  defaultStatus = "",
  countryLabel = "Country",
  countryOptions,
  defaultCountry = "",
  sortOptions,
  defaultSort = "",
  defaultDir = "",
  showDateRange = false,
  dateRangeLabel = "Date range",
  defaultDateFrom = "",
  defaultDateTo = "",
}: Props) {
  const router                       = useRouter()
  const pathname                     = usePathname()
  const searchParams                 = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [country, setCountry]        = useState(defaultCountry || "all")
  const [countryOpen, setCountryOpen] = useState(false)

  const hasSearchField    = showSearch
  const hasStatusField    = !!statusOptions && statusOptions.length > 0
  const hasCountryField   = !!countryOptions && countryOptions.length > 0
  const hasSortField      = !!sortOptions && sortOptions.length > 0
  const hasDateRangeField = showDateRange

  function applyFilters(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)

    const params = new URLSearchParams(searchParams.toString())
    params.set("page", "1")

    if (hasSearchField) {
      const search = ((data.get("search") as string) ?? "").trim()
      if (search) params.set("search", search)
      else params.delete("search")
    }
    if (hasStatusField) {
      const status = (data.get("status") as string) ?? "all"
      if (status && status !== "all") params.set("status", status)
      else params.delete("status")
    }
    if (hasCountryField) {
      const country = (data.get("country") as string) ?? "all"
      if (country && country !== "all") params.set("country", country)
      else params.delete("country")
    }
    if (hasSortField) {
      const sort = (data.get("sort") as string) || (sortOptions?.[0]?.value ?? "")
      const dir  = (data.get("dir")  as string) || "desc"
      params.set("sort", sort)
      params.set("dir",  dir)
    }
    if (hasDateRangeField) {
      const dateFrom = ((data.get("dateFrom") as string) ?? "").trim()
      const dateTo   = ((data.get("dateTo")   as string) ?? "").trim()
      if (dateFrom) params.set("dateFrom", dateFrom); else params.delete("dateFrom")
      if (dateTo)   params.set("dateTo",   dateTo);   else params.delete("dateTo")
    }

    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function clearFilters() {
    startTransition(() => router.push(pathname))
  }

  const hasFilters = Boolean(
    defaultSearch ||
    (defaultStatus && defaultStatus !== "all") ||
    (defaultCountry && defaultCountry !== "all") ||
    defaultDateFrom ||
    defaultDateTo
  )

  return (
    <form onSubmit={applyFilters} className="admin-card flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-3">

      {hasSearchField && (
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            defaultValue={defaultSearch}
            placeholder={searchPlaceholder}
            className="h-10 rounded-full border-border/80 bg-muted/40 pl-10 shadow-none transition-colors focus-visible:bg-card"
          />
        </div>
      )}

      {hasStatusField && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">{statusLabel}</Label>
          <Select name="status" defaultValue={defaultStatus || "all"}>
            <SelectTrigger className="w-52 rounded-full" style={selectStyle}>
              <SelectValue placeholder={statusLabel} />
            </SelectTrigger>
            <SelectContent className="rounded-xl" style={contentStyle}>
              {statusOptions!.map(({ value, label, dot }) => (
                <SelectItem key={value} value={value} className="rounded-lg py-2">
                  {dot && <StatusDot className={dot} />}
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {hasCountryField && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">{countryLabel}</Label>
          <input type="hidden" name="country" value={country} />
          <Popover open={countryOpen} onOpenChange={setCountryOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={countryOpen}
                className="w-52 justify-between rounded-full font-normal"
                style={selectStyle}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Globe2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {country === "all" ? "All countries" : (countryOptions!.find((o) => o.value === country)?.label ?? "All countries")}
                  </span>
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] rounded-xl p-0" style={contentStyle} align="start">
              <Command style={{ backgroundColor: "var(--popover)" }}>
                <CommandInput placeholder={`Search ${countryLabel.toLowerCase()}…`} className="h-9 text-sm" style={{ color: "var(--popover-foreground)" }} />
                <CommandList>
                  <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">No country found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="All countries"
                      onSelect={() => { setCountry("all"); setCountryOpen(false) }}
                      className="cursor-pointer"
                      style={{ color: "var(--popover-foreground)" }}
                    >
                      <Check className={cn("h-4 w-4 shrink-0 text-primary", country === "all" ? "opacity-100" : "opacity-0")} />
                      All countries
                    </CommandItem>
                    {countryOptions!.map(({ value, label }) => (
                      <CommandItem
                        key={value}
                        value={label}
                        onSelect={() => { setCountry(value); setCountryOpen(false) }}
                        className="cursor-pointer"
                        style={{ color: "var(--popover-foreground)" }}
                      >
                        <Check className={cn("h-4 w-4 shrink-0 text-primary", country === value ? "opacity-100" : "opacity-0")} />
                        {label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {hasDateRangeField && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">{dateRangeLabel}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              name="dateFrom"
              defaultValue={defaultDateFrom}
              aria-label="From date"
              className="h-10 w-[9.5rem] rounded-full border-border/80 bg-muted/40 shadow-none transition-colors focus-visible:bg-card"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              name="dateTo"
              defaultValue={defaultDateTo}
              aria-label="To date"
              min={defaultDateFrom || undefined}
              className="h-10 w-[9.5rem] rounded-full border-border/80 bg-muted/40 shadow-none transition-colors focus-visible:bg-card"
            />
          </div>
        </div>
      )}

      {hasSortField && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Sort by</Label>
            <Select name="sort" defaultValue={defaultSort || sortOptions![0]!.value}>
              <SelectTrigger className="w-48 rounded-full" style={selectStyle}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl" style={contentStyle}>
                {sortOptions!.map(({ value, label, icon }) => (
                  <SelectItem key={value} value={value} className="rounded-lg py-2">
                    {icon === "az"
                      ? <ArrowDownAZ className="h-3.5 w-3.5 text-muted-foreground" />
                      : <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />}
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Order</Label>
            <Select name="dir" defaultValue={defaultDir || "desc"}>
              <SelectTrigger className="w-40 rounded-full" style={selectStyle}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl" style={contentStyle}>
                <SelectItem value="desc" className="rounded-lg py-2">Newest first</SelectItem>
                <SelectItem value="asc" className="rounded-lg py-2">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="flex items-end gap-2">
        <Button
          type="submit"
          size="sm"
          className="rounded-full gap-1.5 shadow-sm transition-transform hover:-translate-y-px active:scale-[0.97] active:translate-y-0"
          style={{
            backgroundImage: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 82%, black 12%))",
          }}
          disabled={isPending}
        >
          {isPending
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <SlidersHorizontal className="h-3.5 w-3.5" />
          }
          {isPending ? "Filtering…" : "Filter"}
        </Button>
        {hasFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full gap-1.5 text-muted-foreground transition-all hover:-translate-y-px hover:border-destructive/40 hover:bg-destructive-bg hover:text-destructive active:scale-[0.97] active:translate-y-0"
            onClick={clearFilters}
            disabled={isPending}
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>
    </form>
  )
}
