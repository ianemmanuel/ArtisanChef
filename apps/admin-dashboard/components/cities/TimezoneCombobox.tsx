"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, Clock } from "lucide-react"
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

interface Props {
  value   : string
  onChange: (value: string) => void
}

// Intl.supportedValuesOf("timeZone") — the IANA tz database baked into the
// JS engine itself (Node >=18.5, every evergreen browser). No npm package
// needed and no risk of drifting out of sync with a bundled copy.
const ALL_TIMEZONES: string[] = typeof Intl.supportedValuesOf === "function"
  ? Intl.supportedValuesOf("timeZone")
  : []

function formatOffset(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date())
    return parts.find((p) => p.type === "timeZoneName")?.value ?? ""
  } catch {
    return ""
  }
}

/** Searchable timezone dropdown — backed by the platform's own IANA tz data. */
export function TimezoneCombobox({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)

  const options = useMemo(
    () => ALL_TIMEZONES.map((tz) => ({ tz, label: tz.replace(/_/g, " "), offset: formatOffset(tz) })),
    [],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between rounded-xl font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{value ? value.replace(/_/g, " ") : "Select a timezone…"}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        style={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
        align="start"
      >
        <Command style={{ backgroundColor: "var(--popover)" }}>
          <CommandInput placeholder="Search timezones…" className="h-9 text-sm" style={{ color: "var(--popover-foreground)" }} />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">No timezone found.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.tz}
                  value={opt.tz}
                  onSelect={() => { onChange(opt.tz); setOpen(false) }}
                  className="cursor-pointer"
                  style={{ color: "var(--popover-foreground)" }}
                >
                  <Check className={cn("mr-2 h-4 w-4 shrink-0 text-primary", value === opt.tz ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0 flex-1 truncate text-sm">{opt.label}</span>
                  {opt.offset && <span className="ml-2 shrink-0 text-xs text-muted-foreground">{opt.offset}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
