"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Power, PowerOff } from "lucide-react"
import { Button } from "@repo/ui/components/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@repo/ui/components/alert-dialog"

interface Props {
  countrySlug: string
  countryName: string
  status     : string
  /** SETTINGS_GEOGRAPHY_WRITE, and the backend hard-requires global scope too */
  canWrite   : boolean
  isGlobal   : boolean
  size?      : "sm" | "default"
}

/**
 * Activate/deactivate is the only mutation countries support from the admin
 * dashboard — there's no create endpoint (countries are seed-managed).
 * Backend requires global scope for this regardless of permission, so a
 * country-scoped WRITE holder still can't flip it — hidden here rather than
 * shown-then-403'd.
 */
export function CountryActions({ countrySlug, countryName, status, canWrite, isGlobal, size = "sm" }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  if (!canWrite || !isGlobal) return null

  const isActive = status === "ACTIVE"
  const action   = isActive ? "deactivate" : "activate"

  async function confirm() {
    setPending(true)
    try {
      const res = await fetch(`/api/countries/${countrySlug}/${action}`, { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        toast.success(isActive ? "Country deactivated" : "Country activated", {
          description: isActive
            ? `${countryName} is now hidden from vendor onboarding and new orders.`
            : `${countryName} is now live for vendor onboarding and orders.`,
        })
        setOpen(false)
        router.refresh()
      } else {
        toast.error("Action failed", { description: data.message ?? "Please try again." })
      }
    } catch {
      toast.error("Network error", { description: "Please try again." })
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        className={[
          "gap-1.5 rounded-full transition-all hover:-translate-y-px",
          isActive
            ? "border-destructive/30 text-destructive hover:bg-destructive-bg"
            : "border-success/30 text-success hover:bg-success-bg",
        ].join(" ")}
        onClick={(e) => { e.preventDefault(); setOpen(true) }}
      >
        {isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
        {isActive ? "Deactivate" : "Activate"}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className={`icon-badge h-11 w-11 ${isActive ? "icon-badge-danger" : "icon-badge-success"}`}>
              {isActive ? <PowerOff className="h-5 w-5" /> : <Power className="h-5 w-5" />}
            </div>
            <AlertDialogTitle>{isActive ? "Deactivate" : "Activate"} {countryName}?</AlertDialogTitle>
            <AlertDialogDescription>
              {isActive
                ? "Vendors will no longer be able to onboard or operate in this country until it's reactivated."
                : "This country becomes visible for vendor onboarding, city management, and orders immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={isActive ? "destructive" : "default"}
              className="rounded-full gap-1.5"
              disabled={pending}
              onClick={confirm}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? "Saving…" : isActive ? "Deactivate" : "Activate"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
