"use client"

import { useState, type ComponentType } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Search, SlidersHorizontal, X, Loader2, ArrowDownAZ, ArrowDownUp, Check, ChevronsUpDown, Globe2, Tag, FileText } from "lucide-react"
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

  categoryLabel?: string
  categoryOptions?: FilterSelectOption[]
  defaultCategory?: string

  docTypeLabel?: string
  docTypeOptions?: FilterSelectOption[]
  defaultDocType?: string

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

interface SearchableComboFieldProps {
  fieldName: string
  label: string
  icon: ComponentType<{ className?: string }>
  allLabel: string
  options: FilterSelectOption[]
  value: string
  onChange: (value: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Searchable Command+Popover combobox — extracted from the original
 * country-only picker so any select-like filter (country, category, …) can
 * search a long option list instead of scrolling a plain <Select>.
 */
function SearchableComboField({
  fieldName, label, icon: Icon, allLabel, options, value, onChange, open, onOpenChange,
}: SearchableComboFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <input type="hidden" name={fieldName} value={value} />
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between rounded-full font-normal sm:w-52"
            style={selectStyle}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {value === "all" ? allLabel : (options.find((o) => o.value === value)?.label ?? allLabel)}
              </span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] rounded-xl p-0" style={contentStyle} align="start">
          <Command style={{ backgroundColor: "var(--popover)" }}>
            <CommandInput placeholder={`Search ${label.toLowerCase()}…`} className="h-9 text-sm" style={{ color: "var(--popover-foreground)" }} />
            <CommandList>
              <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">No {label.toLowerCase()} found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value={allLabel}
                  onSelect={() => { onChange("all"); onOpenChange(false) }}
                  className="cursor-pointer"
                  style={{ color: "var(--popover-foreground)" }}
                >
                  <Check className={cn("h-4 w-4 shrink-0 text-primary", value === "all" ? "opacity-100" : "opacity-0")} />
                  {allLabel}
                </CommandItem>
                {options.map(({ value: optValue, label: optLabel }) => (
                  <CommandItem
                    key={optValue}
                    value={optLabel}
                    onSelect={() => { onChange(optValue); onOpenChange(false) }}
                    className="cursor-pointer"
                    style={{ color: "var(--popover-foreground)" }}
                  >
                    <Check className={cn("h-4 w-4 shrink-0 text-primary", value === optValue ? "opacity-100" : "opacity-0")} />
                    {optLabel}
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
  categoryLabel = "Category",
  categoryOptions,
  defaultCategory = "",
  docTypeLabel = "Document Type",
  docTypeOptions,
  defaultDocType = "",
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
  const [category, setCategory]       = useState(defaultCategory || "all")
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [docType, setDocType]         = useState(defaultDocType || "all")
  const [docTypeOpen, setDocTypeOpen] = useState(false)

  const hasSearchField    = showSearch
  const hasStatusField    = !!statusOptions && statusOptions.length > 0
  const hasCountryField   = !!countryOptions && countryOptions.length > 0
  const hasCategoryField  = !!categoryOptions && categoryOptions.length > 0
  const hasDocTypeField   = !!docTypeOptions && docTypeOptions.length > 0
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
    if (hasCategoryField) {
      const category = (data.get("category") as string) ?? "all"
      if (category && category !== "all") params.set("category", category)
      else params.delete("category")
    }
    if (hasDocTypeField) {
      const docType = (data.get("docType") as string) ?? "all"
      if (docType && docType !== "all") params.set("docType", docType)
      else params.delete("docType")
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
    (defaultCategory && defaultCategory !== "all") ||
    (defaultDocType && defaultDocType !== "all") ||
    defaultDateFrom ||
    defaultDateTo
  )

  return (
    <form onSubmit={applyFilters} className="admin-card flex flex-col flex-wrap gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:gap-3">

      {hasSearchField && (
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            defaultValue={defaultSearch}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-full border-border/80 bg-muted/40 pl-10 shadow-none transition-colors focus-visible:bg-card"
          />
        </div>
      )}

      {hasStatusField && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">{statusLabel}</Label>
          <Select name="status" defaultValue={defaultStatus || "all"}>
            <SelectTrigger className="w-full rounded-full sm:w-52" style={selectStyle}>
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
        <SearchableComboField
          fieldName="country"
          label={countryLabel}
          icon={Globe2}
          allLabel="All countries"
          options={countryOptions!}
          value={country}
          onChange={setCountry}
          open={countryOpen}
          onOpenChange={setCountryOpen}
        />
      )}

      {hasCategoryField && (
        <SearchableComboField
          fieldName="category"
          label={categoryLabel}
          icon={Tag}
          allLabel="All categories"
          options={categoryOptions!}
          value={category}
          onChange={setCategory}
          open={categoryOpen}
          onOpenChange={setCategoryOpen}
        />
      )}

      {hasDocTypeField && (
        <SearchableComboField
          fieldName="docType"
          label={docTypeLabel}
          icon={FileText}
          allLabel="All document types"
          options={docTypeOptions!}
          value={docType}
          onChange={setDocType}
          open={docTypeOpen}
          onOpenChange={setDocTypeOpen}
        />
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
              className="h-10 w-32 min-w-0 flex-1 rounded-full border-border/80 bg-muted/40 shadow-none transition-colors focus-visible:bg-card sm:w-[9.5rem] sm:flex-none"
            />
            <span className="shrink-0 text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              name="dateTo"
              defaultValue={defaultDateTo}
              aria-label="To date"
              min={defaultDateFrom || undefined}
              className="h-10 w-32 min-w-0 flex-1 rounded-full border-border/80 bg-muted/40 shadow-none transition-colors focus-visible:bg-card sm:w-[9.5rem] sm:flex-none"
            />
          </div>
        </div>
      )}

      {hasSortField && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Sort by</Label>
            <Select name="sort" defaultValue={defaultSort || sortOptions![0]!.value}>
              <SelectTrigger className="w-full rounded-full sm:w-48" style={selectStyle}>
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
              <SelectTrigger className="w-full rounded-full sm:w-40" style={selectStyle}>
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
