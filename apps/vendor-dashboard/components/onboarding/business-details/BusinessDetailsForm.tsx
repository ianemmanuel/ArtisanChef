"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Loader2, ArrowRight, InfoIcon } from "lucide-react"
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
}

export function BusinessDetailsForm({ application, countries }: Props) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [vendorTypes, setVendorTypes] = useState<VendorType[]>([])
  const [loadingVendorTypes, setLoadingVendorTypes] = useState(false)
  const [showOtherVendorType, setShowOtherVendorType] = useState(false)

  const form = useForm<BusinessDetailsFormData>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: {
      countryId: application?.countryId ?? "",
      vendorTypeId: application?.vendorTypeId ?? "",
      otherVendorType: application?.otherVendorType ?? "",
      legalBusinessName: application?.legalBusinessName ?? "",
      registrationNumber: application?.registrationNumber ?? "",
      taxId: application?.taxId ?? "",
      businessEmail: application?.businessEmail ?? "",
      businessPhone: application?.businessPhone ?? "",
      ownerFirstName: application?.ownerFirstName ?? "",
      ownerLastName: application?.ownerLastName ?? "",
      ownerEmail: application?.ownerEmail ?? "",
      ownerPhone: application?.ownerPhone ?? "",
      businessAddress: application?.businessAddress ?? "",
      addressLine2: application?.addressLine2 ?? "",
      postalCode: application?.postalCode ?? "",
    },
  })

  const countryId = form.watch("countryId")
  const vendorTypeId = form.watch("vendorTypeId")
  const isCountryLocked = !!application && application.status !== "DRAFT"

  // ----------------- Fetch Vendor Types -----------------
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

        if (json.status !== "success") throw new Error(json.message || "Failed to fetch vendor types")

        const types: VendorType[] = json.data?.vendorTypes ?? []
        setVendorTypes(types)

        // Preserve previous vendorTypeId if still valid
        if (application?.vendorTypeId && types.some(t => t.id === application.vendorTypeId)) {
          form.setValue("vendorTypeId", application.vendorTypeId)
        }
      } catch (err: any) {
        setVendorTypes([])
        setError(err?.message || "Failed to fetch vendor types")
      } finally {
        setLoadingVendorTypes(false)
      }
    }

    fetchVendorTypes()
    return () => controller.abort()
  }, [countryId, application, form])

  //* ----------------- Show "Other vendor type" -----------------
  useEffect(() => {
    const selected = vendorTypes.find(t => t.id === vendorTypeId)
    setShowOtherVendorType(selected?.name?.toLowerCase() === "other")
    if (selected?.name?.toLowerCase() !== "other") form.setValue("otherVendorType", "")
  }, [vendorTypeId, vendorTypes, form])

  //* ----------------- Form Submit -----------------
  async function onSubmit(values: BusinessDetailsFormData) {
    setError(null)
    startTransition(async () => {
      try {
        const token = await getToken()
        if (!token) return setError("Authentication error")

        const res = await fetch(`/api/onboarding/application`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(values),
        })

        const data = await res.json()
        if (!res.ok || data.status !== "success") {
          throw new Error(data?.message || "Failed to save application")
        }
        toast.success("Business details saved")
        router.push("/onboarding/documents")
      } catch (err: any) {
        setError(err?.message || "Something went wrong")
      }
    })
  }

  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
        {error && (
          <Alert variant="destructive" className="mb-4">
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
                    <Select value={field.value} onValueChange={field.onChange} disabled={isCountryLocked}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
                    <Select value={field.value} onValueChange={field.onChange} disabled={!countryId || loadingVendorTypes}>
                      <SelectTrigger>
                        <SelectValue placeholder={!countryId ? "Select country first" : loadingVendorTypes ? "Loading..." : "Select vendor type"} />
                      </SelectTrigger>
                      <SelectContent>
                        {vendorTypes.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
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
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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

        {/* Submit */}
        <div className="flex justify-end border-t pt-6">
          <Button type="submit" disabled={isPending} className="bg-orange-500 hover:bg-orange-600 text-white">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Save & Continue <ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
        </div>
      </form>
    </Form>
  )
}

// ---------------- Helper Section Component ----------------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-4">{title}</h2>
      {children}
    </div>
  )
}