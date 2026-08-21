"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"
import { Loader2, Plus, Pencil } from "lucide-react"
import { Button } from "@repo/ui/components/button"
import { Label } from "@repo/ui/components/label"
import { Input } from "@repo/ui/components/input"
import { Textarea } from "@repo/ui/components/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@repo/ui/components/dialog"
import { vendorTypeSchema, type VendorTypeFormValues } from "@/lib/zod/vendor-type"
import { getFieldError } from "@/lib/forms/form-helpers"
import type { VendorType } from "@/types/vendor-type.types"

interface Props {
  /** Omit for create mode, pass the vendor type for edit mode. */
  vendorType?: VendorType
}

export function VendorTypeFormDialog({ vendorType }: Props) {
  const router = useRouter()
  const isEdit = !!vendorType

  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      name       : vendorType?.name ?? "",
      description: vendorType?.description ?? "",
    } as VendorTypeFormValues,
    validators: { onSubmit: vendorTypeSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)
      try {
        const res = await fetch(
          isEdit ? `/api/vendor-types/${vendorType.id}` : "/api/vendor-types",
          {
            method : isEdit ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body   : JSON.stringify({
              name       : value.name.trim(),
              description: value.description.trim() || undefined,
            }),
          },
        )
        const data = await res.json()
        if (res.ok) {
          toast.success(isEdit ? "Vendor type updated" : "Vendor type created", {
            description: isEdit
              ? `${value.name} has been updated.`
              : `${value.name} is now available to assign to countries.`,
          })
          setOpen(false)
          form.reset()
          router.refresh()
        } else {
          const msg = data.message ?? "Something went wrong."
          setFormError(msg)
          toast.error(isEdit ? "Update failed" : "Creation failed", { description: msg })
        }
      } catch {
        const msg = "Network error. Please try again."
        setFormError(msg)
        toast.error("Network error", { description: msg })
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setFormError(null); form.reset() } }}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-full">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="gap-1.5 rounded-full shadow-sm transition-transform hover:-translate-y-px active:scale-[0.97]"
            style={{ backgroundImage: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 82%, black 12%))" }}
          >
            <Plus className="h-4 w-4" />
            New Vendor Type
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit vendor type" : "New vendor type"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the name or description shown across the admin dashboard and vendor onboarding."
              : "Vendor types classify what an outlet sells — e.g. Restaurant, Grocery, Pharmacy — and drive which document types are required during onboarding."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="vendor-type-form"
          onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
          className="space-y-3"
        >
          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <form.Field name="name" validators={{ onBlur: vendorTypeSchema.shape.name }}>
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="vendor-type-name">Name *</Label>
                <Input
                  id="vendor-type-name"
                  placeholder="e.g. Restaurant"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="rounded-xl text-sm"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{getFieldError(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="vendor-type-description">Description (optional)</Label>
                <Textarea
                  id="vendor-type-description"
                  placeholder="What kind of vendor is this?"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="min-h-20 text-sm"
                />
              </div>
            )}
          </form.Field>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <form.Subscribe selector={(s) => ({ isSubmitting: s.isSubmitting })}>
            {({ isSubmitting }) => (
              <Button
                type="submit"
                form="vendor-type-form"
                className="rounded-full gap-1.5 shadow-sm"
                style={{ backgroundImage: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 82%, black 12%))" }}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create vendor type"}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
