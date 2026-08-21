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
import { Checkbox } from "@repo/ui/components/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@repo/ui/components/dialog"
import {
  documentTypeCreateSchema,
  documentTypeUpdateSchema,
  type DocumentTypeCreateFormValues,
  type DocumentTypeUpdateFormValues,
} from "@/lib/zod/document-type"
import { getFieldError } from "@/lib/forms/form-helpers"
import type { DocumentTypeConfig } from "@/types/document-type.types"

interface Props {
  /** Required for create mode — which country this document type belongs to. */
  countryId?    : string
  /** Pass for edit mode. */
  documentType? : DocumentTypeConfig
}

export function DocumentTypeFormDialog({ countryId, documentType }: Props) {
  const router = useRouter()
  const isEdit = !!documentType

  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const createForm = useForm({
    defaultValues: {
      name             : "",
      code             : "",
      description      : "",
      scope            : "VENDOR",
      isRequired       : true,
      requiresExpiry   : true,
      expiryWarningDays: 30,
      instructions     : "",
      sampleUrl        : "",
    } as DocumentTypeCreateFormValues,
    validators: { onSubmit: documentTypeCreateSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)
      try {
        const res = await fetch("/api/document-types", {
          method : "POST",
          headers: { "Content-Type": "application/json" },
          body   : JSON.stringify({
            ...value,
            description : value.description.trim() || undefined,
            instructions: value.instructions.trim() || undefined,
            sampleUrl   : value.sampleUrl.trim() || undefined,
            countryId,
          }),
        })
        const data = await res.json()
        if (res.ok) {
          toast.success("Document type created", { description: `${value.name} is now part of onboarding requirements.` })
          setOpen(false)
          createForm.reset()
          router.refresh()
        } else {
          const msg = data.message ?? "Something went wrong."
          setFormError(msg)
          toast.error("Creation failed", { description: msg })
        }
      } catch {
        setFormError("Network error. Please try again.")
        toast.error("Network error", { description: "Please try again." })
      }
    },
  })

  const updateForm = useForm({
    defaultValues: {
      name             : documentType?.name ?? "",
      description      : documentType?.description ?? "",
      isRequired       : documentType?.isRequired ?? true,
      requiresExpiry   : documentType?.requiresExpiry ?? true,
      expiryWarningDays: documentType?.expiryWarningDays ?? 30,
      instructions     : documentType?.instructions ?? "",
      sampleUrl        : documentType?.sampleUrl ?? "",
    } as DocumentTypeUpdateFormValues,
    validators: { onSubmit: documentTypeUpdateSchema },
    onSubmit: async ({ value }) => {
      if (!documentType) return
      setFormError(null)
      try {
        const res = await fetch(`/api/document-types/${documentType.id}`, {
          method : "PATCH",
          headers: { "Content-Type": "application/json" },
          body   : JSON.stringify({
            ...value,
            description : value.description.trim() || undefined,
            instructions: value.instructions.trim() || undefined,
            sampleUrl   : value.sampleUrl.trim() || undefined,
          }),
        })
        const data = await res.json()
        if (res.ok) {
          toast.success("Document type updated")
          setOpen(false)
          router.refresh()
        } else {
          const msg = data.message ?? "Something went wrong."
          setFormError(msg)
          toast.error("Update failed", { description: msg })
        }
      } catch {
        setFormError("Network error. Please try again.")
        toast.error("Network error", { description: "Please try again." })
      }
    },
  })

  const form = isEdit ? updateForm : createForm

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
            disabled={!countryId}
          >
            <Plus className="h-4 w-4" />
            New Document Type
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit document type" : "New document type"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Code, scope and country can't be changed after creation."
              : "Defines a document vendors or outlets must upload during onboarding."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="document-type-form"
          onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
          className="space-y-3"
        >
          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            {isEdit ? (
              <updateForm.Field name="name" validators={{ onBlur: documentTypeUpdateSchema.shape.name }}>
                {(field) => (
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="doc-type-name">Name *</Label>
                    <Input
                      id="doc-type-name"
                      placeholder="e.g. Business Registration Certificate"
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
              </updateForm.Field>
            ) : (
              <createForm.Field name="name" validators={{ onBlur: documentTypeCreateSchema.shape.name }}>
                {(field) => (
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="doc-type-name">Name *</Label>
                    <Input
                      id="doc-type-name"
                      placeholder="e.g. Business Registration Certificate"
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
              </createForm.Field>
            )}

            {!isEdit && (
              <createForm.Field name="code" validators={{ onBlur: documentTypeCreateSchema.shape.code }}>
                {(field) => (
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="doc-type-code">Code *</Label>
                    <Input
                      id="doc-type-code"
                      placeholder="e.g. BUSINESS_REG_CERT"
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
              </createForm.Field>
            )}

            {isEdit && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Code</Label>
                <p className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground">
                  {documentType?.code}
                </p>
              </div>
            )}
          </div>

          {!isEdit && (
            <createForm.Field name="scope">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">Scope</Label>
                  <Select value={field.state.value} onValueChange={(v) => field.handleChange(v as "VENDOR" | "OUTLET")}>
                    <SelectTrigger className="w-full rounded-xl text-sm" style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl" style={{ backgroundColor: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)" }}>
                      <SelectItem value="VENDOR" className="rounded-lg">Vendor — required once per vendor account</SelectItem>
                      <SelectItem value="OUTLET" className="rounded-lg">Outlet — required per outlet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </createForm.Field>
          )}

          {isEdit ? (
            <updateForm.Field name="description">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor="doc-type-description">Description (optional)</Label>
                  <Textarea
                    id="doc-type-description"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="min-h-16 text-sm"
                  />
                </div>
              )}
            </updateForm.Field>
          ) : (
            <createForm.Field name="description">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor="doc-type-description">Description (optional)</Label>
                  <Textarea
                    id="doc-type-description"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="min-h-16 text-sm"
                  />
                </div>
              )}
            </createForm.Field>
          )}

          <div className="flex flex-wrap items-center gap-5">
            {isEdit ? (
              <updateForm.Field name="isRequired">
                {(field) => (
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <Checkbox checked={field.state.value} onCheckedChange={(c) => field.handleChange(c === true)} />
                    Required
                  </label>
                )}
              </updateForm.Field>
            ) : (
              <createForm.Field name="isRequired">
                {(field) => (
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <Checkbox checked={field.state.value} onCheckedChange={(c) => field.handleChange(c === true)} />
                    Required
                  </label>
                )}
              </createForm.Field>
            )}

            {isEdit ? (
              <updateForm.Field name="requiresExpiry">
                {(field) => (
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <Checkbox checked={field.state.value} onCheckedChange={(c) => field.handleChange(c === true)} />
                    Has expiry date
                  </label>
                )}
              </updateForm.Field>
            ) : (
              <createForm.Field name="requiresExpiry">
                {(field) => (
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <Checkbox checked={field.state.value} onCheckedChange={(c) => field.handleChange(c === true)} />
                    Has expiry date
                  </label>
                )}
              </createForm.Field>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {isEdit ? (
              <updateForm.Field name="expiryWarningDays">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="doc-type-expiry-days">Expiry warning (days before)</Label>
                    <Input
                      id="doc-type-expiry-days"
                      type="number"
                      min={0}
                      max={365}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(Number(e.target.value))}
                      className="rounded-xl text-sm"
                    />
                  </div>
                )}
              </updateForm.Field>
            ) : (
              <createForm.Field name="expiryWarningDays">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="doc-type-expiry-days">Expiry warning (days before)</Label>
                    <Input
                      id="doc-type-expiry-days"
                      type="number"
                      min={0}
                      max={365}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(Number(e.target.value))}
                      className="rounded-xl text-sm"
                    />
                  </div>
                )}
              </createForm.Field>
            )}

            {isEdit ? (
              <updateForm.Field name="sampleUrl">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="doc-type-sample-url">Sample URL (optional)</Label>
                    <Input
                      id="doc-type-sample-url"
                      placeholder="https://…"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="rounded-xl text-sm"
                    />
                  </div>
                )}
              </updateForm.Field>
            ) : (
              <createForm.Field name="sampleUrl">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="doc-type-sample-url">Sample URL (optional)</Label>
                    <Input
                      id="doc-type-sample-url"
                      placeholder="https://…"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="rounded-xl text-sm"
                    />
                  </div>
                )}
              </createForm.Field>
            )}
          </div>

          {isEdit ? (
            <updateForm.Field name="instructions">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor="doc-type-instructions">Instructions shown to vendor (optional)</Label>
                  <Textarea
                    id="doc-type-instructions"
                    placeholder="e.g. Upload a clear photo of the original document"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="min-h-16 text-sm"
                  />
                </div>
              )}
            </updateForm.Field>
          ) : (
            <createForm.Field name="instructions">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor="doc-type-instructions">Instructions shown to vendor (optional)</Label>
                  <Textarea
                    id="doc-type-instructions"
                    placeholder="e.g. Upload a clear photo of the original document"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="min-h-16 text-sm"
                  />
                </div>
              )}
            </createForm.Field>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <form.Subscribe selector={(s) => ({ isSubmitting: s.isSubmitting })}>
            {({ isSubmitting }) => (
              <Button
                type="submit"
                form="document-type-form"
                className="rounded-full gap-1.5 shadow-sm"
                style={{ backgroundImage: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 82%, black 12%))" }}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create document type"}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
