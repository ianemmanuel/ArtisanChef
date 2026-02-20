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
import { upsertApplication } from "@/lib/api/onboarding"

interface BusinessDetailsStepProps {
  countries: any[]
  onSuccess: () => void
}

export default function BusinessDetailsStep({
  countries,
  onSuccess,
}: BusinessDetailsStepProps) {
  const { application, setApplication } = useOnboardingStore()

  const [vendorTypes, setVendorTypes] = useState<any[]>([])
  const [isLoadingVendorTypes, setIsLoadingVendorTypes] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showOtherVendorType, setShowOtherVendorType] = useState(false)

  const form = useForm<BusinessDetailsFormData>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: {
      countryId: "",
      vendorTypeId: "",
      otherVendorType: "",
      legalBusinessName: "",
      registrationNumber: "",
      taxId: "",
      businessEmail: "",
      businessPhone: "",
      ownerFirstName: "",
      ownerLastName: "",
      ownerPhone: "",
      ownerEmail: "",
      businessAddress: "",
      addressLine2: "",
      postalCode: "",
    },
  })

  /**
   * Hydrate form from application (reload-safe)
   */
  useEffect(() => {
    if (!application) return

    form.reset({
      countryId: application.countryId ?? "",
      vendorTypeId: application.vendorTypeId ?? "",
      otherVendorType: application.otherVendorType ?? "",
      legalBusinessName: application.legalBusinessName ?? "",
      registrationNumber: application.registrationNumber ?? "",
      taxId: application.taxId ?? "",
      businessEmail: application.businessEmail ?? "",
      businessPhone: application.businessPhone ?? "",
      ownerFirstName: application.ownerFirstName ?? "",
      ownerLastName: application.ownerLastName ?? "",
      ownerPhone: application.ownerPhone ?? "",
      ownerEmail: application.ownerEmail ?? "",
      businessAddress: application.businessAddress ?? "",
      addressLine2: application.addressLine2 ?? "",
      postalCode: application.postalCode ?? "",
    })
  }, [application, form])

  /**
   * Watch country + vendor type
   */
  const countryId = form.watch("countryId")
  const vendorTypeId = form.watch("vendorTypeId")

  /**
   * Fetch vendor types when country changes
   */
  useEffect(() => {
    if (!countryId) {
      setVendorTypes([])
      form.setValue("vendorTypeId", "")
      return
    }

    const fetchVendorTypes = async () => {
      try {
        setIsLoadingVendorTypes(true)

        const res = await fetch(
          `/api/onboarding/vendor-types?countryId=${countryId}`
        )

        if (!res.ok) {
          throw new Error("Failed to load vendor types")
        }

        const json = await res.json()
        setVendorTypes(json.data.vendorTypes)
      } catch (error) {
        console.error(error)
        toast.error("Failed to load vendor types")
        setVendorTypes([])
      } finally {
        setIsLoadingVendorTypes(false)
      }
    }

    fetchVendorTypes()
  }, [countryId, form])

  /**
   * Reset vendor type when country changes (if editing)
   */
  useEffect(() => {
    if (!application?.countryId) return

    if (application.countryId !== countryId) {
      form.setValue("vendorTypeId", "")
      setVendorTypes([])
    }
  }, [countryId, application?.countryId, form])

  /**
   * Toggle "Other vendor type"
   */
  useEffect(() => {
    const selected = vendorTypes.find((t) => t.id === vendorTypeId)
    setShowOtherVendorType(
      selected?.name?.toLowerCase() === "other"
    )
  }, [vendorTypeId, vendorTypes])

  /**
   * Submit handler
   */
  const onSubmit = async (data: BusinessDetailsFormData) => {
    setIsSubmitting(true)

    try {
      const { application } = await upsertApplication(data)

      setApplication(application)
      toast.success("Business details saved")

      onSuccess()
    } catch (err: any) {
      toast.error(
        err?.message ?? "Failed to save application"
      )
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8"
      >
        {/* -------- Business Info -------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Country */}
          <FormField
            control={form.control}
            name="countryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country *</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value)
                  }}
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
        </div>

        {/* Other Vendor Type */}
        {showOtherVendorType && (
          <FormField
            control={form.control}
            name="otherVendorType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specify Vendor Type *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your vendor type"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Legal Name */}
        <FormField
          control={form.control}
          name="legalBusinessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Legal Business Name *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Acme Corporation Ltd."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit */}
        <div className="flex justify-end pt-6 border-t">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
          >
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
