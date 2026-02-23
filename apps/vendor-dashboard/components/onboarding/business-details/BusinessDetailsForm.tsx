"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Loader2, ArrowRight, InfoIcon, AlertTriangle } from "lucide-react"
import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@repo/ui/components/select"
import { Alert, AlertDescription } from "@repo/ui/components/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@repo/ui/components/form"

import { businessDetailsSchema, BusinessDetailsFormData } from "@/lib/validations/onboarding"
import type { Application, Country, VendorType } from "@repo/types"
import { toast } from "sonner"

interface Props {
  application: Application | null
  countries: Country[]
  // Pass whether the application already has uploaded docs — used to warn before country/type change
  hasDocuments: boolean
}

export function BusinessDetailsForm({ application, countries, hasDocuments }: Props) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [vendorTypes, setVendorTypes] = useState<VendorType[]>([])
  const [loadingVendorTypes, setLoadingVendorTypes] = useState(false)
  const [showOtherVendorType, setShowOtherVendorType] = useState(false)

  // ── Dialog state ──────────────────────────────────────────────────────────
  // When user tries to change country or vendorType and docs exist, we intercept
  // the change, store the pending value, and show a confirmation dialog.
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMessage, setDialogMessage] = useState("")
  // We use a ref to store the pending field change so the dialog can confirm it
  const pendingChange = useRef<{ field: "countryId" | "vendorTypeId"; value: string } | null>(null)

  const form = useForm<BusinessDetailsFormData>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: {
      countryId:          application?.countryId ?? "",
      vendorTypeId:       application?.vendorTypeId ?? "",
      otherVendorType:    application?.otherVendorType ?? "",
      legalBusinessName:  application?.legalBusinessName ?? "",
      registrationNumber: application?.registrationNumber ?? "",
      taxId:              application?.taxId ?? "",
      businessEmail:      application?.businessEmail ?? "",
      businessPhone:      application?.businessPhone ?? "",
      ownerFirstName:     application?.ownerFirstName ?? "",
      ownerLastName:      application?.ownerLastName ?? "",
      ownerEmail:         application?.ownerEmail ?? "",
      ownerPhone:         application?.ownerPhone ?? "",
      businessAddress:    application?.businessAddress ?? "",
      addressLine2:       application?.addressLine2 ?? "",
      postalCode:         application?.postalCode ?? "",
    },
  })

  const countryId = form.watch("countryId")
  const vendorTypeId = form.watch("vendorTypeId")

  // ── Intercept country / vendorType change if docs exist ──────────────────
  function handleCountryChange(newValue: string) {
    if (hasDocuments && newValue !== application?.countryId) {
      pendingChange.current = { field: "countryId", value: newValue }
      setDialogMessage(
        "Changing your country will delete all uploaded documents because document requirements differ per country. This cannot be undone."
      )
      setDialogOpen(true)
      return
    }
    form.setValue("countryId", newValue)
  }

  function handleVendorTypeChange(newValue: string) {
    if (hasDocuments && newValue !== application?.vendorTypeId) {
      pendingChange.current = { field: "vendorTypeId", value: newValue }
      setDialogMessage(
        "Changing your vendor type will delete all uploaded documents because document requirements differ per vendor type. This cannot be undone."
      )
      setDialogOpen(true)
      return
    }
    form.setValue("vendorTypeId", newValue)
  }

  function handleDialogConfirm() {
    if (!pendingChange.current) return
    const { field, value } = pendingChange.current
    form.setValue(field, value)
    // If country changed, clear vendorTypeId since the list will reload
    if (field === "countryId") {
      form.setValue("vendorTypeId", "")
    }
    pendingChange.current = null
    setDialogOpen(false)
  }

  function handleDialogCancel() {
    pendingChange.current = null
    setDialogOpen(false)
  }

  // ── Fetch vendor types when countryId changes ─────────────────────────────
  useEffect(() => {
    if (!countryId) {
      setVendorTypes([])
      form.setValue("vendorTypeId", "")
      return
    }

    const controller = new AbortController()
    setLoadingVendorTypes(true)

    async function fetchVendorTypes() {
      try {
        const res = await fetch(`/api/onboarding/vendor-types?countryId=${countryId}`, {
          signal: controller.signal,
        })
        const json = await res.json()
        if (json.status !== "success") throw new Error(json.message || "Failed to load vendor types")

        const types: VendorType[] = json.data?.vendorTypes ?? []
        setVendorTypes(types)

        // Restore saved vendorTypeId if it's still valid for the new country
        if (application?.vendorTypeId && types.some(t => t.id === application.vendorTypeId)) {
          form.setValue("vendorTypeId", application.vendorTypeId)
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return
        setVendorTypes([])
        setError("Failed to load vendor types. Please try again.")
      } finally {
        setLoadingVendorTypes(false)
      }
    }

    fetchVendorTypes()
    return () => controller.abort()
  }, [countryId, application, form])

  // ── Show "Other" field when vendor type name is "other" ───────────────────
  useEffect(() => {
    const selected = vendorTypes.find(t => t.id === vendorTypeId)
    setShowOtherVendorType(selected?.name?.toLowerCase() === "other")
    if (selected?.name?.toLowerCase() !== "other") form.setValue("otherVendorType", "")
  }, [vendorTypeId, vendorTypes, form])

  // ── Form Submit ───────────────────────────────────────────────────────────
  async function onSubmit(values: BusinessDetailsFormData) {
    setError(null)
    startTransition(async () => {
      try {
        const token = await getToken()
        if (!token) return setError("Authentication error. Please refresh and try again.")

        const res = await fetch(`/api/onboarding/application`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(values),
        })

        const data = await res.json()

        if (!res.ok || data.status !== "success") {
          // 400s are user-actionable, show as-is. 500s get a generic message.
          const message = res.status < 500
            ? data?.message || "Please check your details and try again."
            : "Something went wrong. Please try again."
          console.error("[BusinessDetailsForm] submit error:", data)
          setError(message)
          return
        }

        toast.success("Business details saved")
        router.push("/onboarding/documents")
      } catch (err: any) {
        console.error("[BusinessDetailsForm] unexpected error:", err)
        setError("Something went wrong. Please try again.")
      }
    })
  }

  return (
    <>
      {/* ── Warning dialog for country / vendorType change ── */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Your documents will be deleted
            </AlertDialogTitle>
            <AlertDialogDescription>{dialogMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDialogCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDialogConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, delete documents & continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-10 bg-white p-8 rounded-2xl border border-stone-200 shadow-sm"
        >
          {error && (
            <Alert variant="destructive">
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Business Registration */}
          <Section title="Business Registration">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="countryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country *</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={handleCountryChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendorTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Type *</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={handleVendorTypeChange}
                        disabled={!countryId || loadingVendorTypes}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !countryId ? "Select country first"
                              : loadingVendorTypes ? "Loading..."
                              : "Select vendor type"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {vendorTypes.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showOtherVendorType && (
                <FormField
                  control={form.control}
                  name="otherVendorType"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Specify Vendor Type *</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="legalBusinessName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Legal Business Name *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Number</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Section>

          {/* Business Contact */}
          <Section title="Business Contact">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="businessEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Email *</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="businessPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Phone</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Section>

          {/* Owner Information */}
          <Section title="Owner Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="ownerFirstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ownerLastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ownerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner Email</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ownerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner Phone</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Section>

          {/* Business Address */}
          <Section title="Business Address">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="businessAddress"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Street Address *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Section>

          {/* Footer */}
          <div className="flex justify-end border-t pt-6">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <>Save & Continue <ArrowRight className="ml-2 h-4 w-4" /></>
              }
            </Button>
          </div>
        </form>
      </Form>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-4">{title}</h2>
      {children}
    </div>
  )
}