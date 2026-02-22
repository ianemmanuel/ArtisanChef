"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import {
  businessDetailsSchema,
  BusinessDetailsFormData,
} from "@/lib/validations/onboarding"

import { useOnboardingStore } from "@/lib/state/onboarding-store"
import { upsertApplication } from "@/lib/api/onboarding"

import { Button } from "@repo/ui/components/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/components/form"
import { Input } from "@repo/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select"

import { toast } from "sonner"

interface VendorType {
  id: string
  name: string
}

interface Country {
  id: string
  name: string
}

interface BusinessDetailsStepProps {
  countries: Country[]
  onSuccess: () => void
}

export default function BusinessDetailsStep({
  countries,
  onSuccess,
}: BusinessDetailsStepProps) {
  const { application, setApplication } = useOnboardingStore()

  const [vendorTypes, setVendorTypes] = useState<VendorType[]>([])
  const [isLoadingVendorTypes, setIsLoadingVendorTypes] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showOtherVendorType, setShowOtherVendorType] = useState(false)

  // ✅ THE FIX: populate defaultValues directly from the store application.
  // Because WizardLayout unmounts this component while fetching on Back,
  // this component always mounts fresh with the latest store data —
  // no useEffect hydration needed, no stale-reference problem.
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
      ownerPhone: application?.ownerPhone ?? "",
      ownerEmail: application?.ownerEmail ?? "",
      businessAddress: application?.businessAddress ?? "",
      addressLine2: application?.addressLine2 ?? "",
      postalCode: application?.postalCode ?? "",
    },
  })

  const countryId = form.watch("countryId")
  const vendorTypeId = form.watch("vendorTypeId")

  /**
   * Fetch vendor types when countryId changes
   */
  useEffect(() => {
    if (!countryId) {
      setVendorTypes([])
      form.setValue("vendorTypeId", "")
      return
    }

    const controller = new AbortController()

    const fetchVendorTypes = async () => {
      try {
        setIsLoadingVendorTypes(true)

        const res = await fetch(
          `/api/onboarding/vendor-types?countryId=${countryId}`,
          { signal: controller.signal }
        )

        const text = await res.text()
        const json = text ? JSON.parse(text) : {}

        if (!res.ok || json.status !== "success") {
          throw new Error(json.message || "Failed to load vendor types")
        }

        const types: VendorType[] = json.data?.vendorTypes ?? []
        setVendorTypes(types)

        // If the saved vendorTypeId is valid for this country, keep it selected.
        // This ensures the field is re-populated when navigating back.
        const savedId = application?.vendorTypeId
        if (savedId && types.some((t) => t.id === savedId)) {
          form.setValue("vendorTypeId", savedId, { shouldValidate: false })
        }
      } catch (error: any) {
        if (error.name === "AbortError") return
        toast.error(error.message || "Failed to load vendor types")
        setVendorTypes([])
      } finally {
        setIsLoadingVendorTypes(false)
      }
    }

    fetchVendorTypes()
    return () => controller.abort()
  }, [countryId]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Toggle "other vendor type" field
   */
  useEffect(() => {
    const selected = vendorTypes.find((t) => t.id === vendorTypeId)
    const isOther = selected?.name?.toLowerCase() === "other"
    setShowOtherVendorType(isOther)
    if (!isOther) form.setValue("otherVendorType", "")
  }, [vendorTypeId, vendorTypes, form])

  /**
   * Submit
   */
  const onSubmit = async (data: BusinessDetailsFormData) => {
    try {
      setIsSubmitting(true)
      const { application } = await upsertApplication(data)
      setApplication(application)
      toast.success("Business details saved")
      onSuccess()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save application")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

        {/* -------- Business Information -------- */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Business Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Country */}
            <FormField
              control={form.control}
              name="countryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!!application?.id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Vendor Type */}
            <FormField
              control={form.control}
              name="vendorTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor Type *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!countryId || isLoadingVendorTypes}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !countryId
                            ? "Select country first"
                            : isLoadingVendorTypes
                            ? "Loading vendor types..."
                            : "Select vendor type"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {vendorTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Other Vendor Type */}
            {showOtherVendorType && (
              <FormField
                control={form.control}
                name="otherVendorType"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Please specify vendor type *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Legal Business Name */}
            <FormField
              control={form.control}
              name="legalBusinessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Legal Business Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Registration Number */}
            <FormField
              control={form.control}
              name="registrationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Registration Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tax ID */}
            <FormField
              control={form.control}
              name="taxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Identification Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Business Email */}
            <FormField
              control={form.control}
              name="businessEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Email *</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Business Phone */}
            <FormField
              control={form.control}
              name="businessPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Phone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>
        </div>

        {/* -------- Owner Information -------- */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Owner Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <FormField
              control={form.control}
              name="ownerFirstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>
        </div>

        {/* -------- Business Address -------- */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Business Address</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <FormField
              control={form.control}
              name="businessAddress"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-6 border-t">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save & Continue"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}