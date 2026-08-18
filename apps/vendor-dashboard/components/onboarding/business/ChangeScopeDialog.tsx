"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { SearchableCombobox } from "@/components/onboarding/SearchableCombobox"
import { useCountries, useVendorTypes, useChangeApplicationScope } from "@/lib/queries/onboarding"
import { ClientApiError } from "@/lib/api/client"
import type { VendorApplicationDetail } from "@repo/types/vendor-app"

//* Changing country/vendor type after data exists is destructive — the
//* backend clears uploaded documents when the scope actually changes
//* (changeApplicationScope). This dialog is the explicit confirmation
//* the backend contract requires the frontend to surface, not a
//* frontend-invented safeguard.
export function ChangeScopeDialog({ application }: { application: VendorApplicationDetail }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [countryId, setCountryId] = React.useState(application.countryId)
  const [vendorTypeId, setVendorTypeId] = React.useState(application.vendorTypeId)

  const { data: countries } = useCountries()
  const { data: vendorTypes } = useVendorTypes(countryId)
  const changeScope = useChangeApplicationScope()

  const isChanged = countryId !== application.countryId || vendorTypeId !== application.vendorTypeId

  async function handleConfirm() {
    try {
      const result = await changeScope.mutateAsync({ countryId, vendorTypeId })
      if (result.documentsCleared) {
        toast.warning("Your previously uploaded documents were cleared for the new business type.")
      }
      setOpen(false)
      router.push("/onboarding/requirements")
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Couldn't change your country/business type.")
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setCountryId(application.countryId)
          setVendorTypeId(application.vendorTypeId)
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="link" className="h-auto px-0 text-muted-foreground">
          Change country or business type
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-warning" /> Change country or business type
          </AlertDialogTitle>
          <AlertDialogDescription>
            If the business type changes, your uploaded documents will be cleared, since document
            requirements differ by business type. Your business details are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Country</Label>
            <SearchableCombobox
              aria-label="Country"
              options={(countries ?? []).map((c) => ({ value: c.id, label: c.name }))}
              value={countryId}
              onChange={(value) => {
                setCountryId(value)
                setVendorTypeId("")
              }}
              placeholder="Select country"
            />
          </div>
          <div className="space-y-2">
            <Label>Business type</Label>
            <SearchableCombobox
              aria-label="Business type"
              options={(vendorTypes ?? []).map((v) => ({ value: v.id, label: v.name }))}
              value={vendorTypeId}
              onChange={setVendorTypeId}
              placeholder="Select business type"
              disabled={!countryId}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!isChanged || !countryId || !vendorTypeId || changeScope.isPending}
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
          >
            {changeScope.isPending ? "Applying..." : "Confirm change"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
