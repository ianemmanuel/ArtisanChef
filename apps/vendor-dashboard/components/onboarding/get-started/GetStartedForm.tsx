"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableCombobox } from "@/components/onboarding/SearchableCombobox"
import { getStartedSchema, type GetStartedInput } from "@/lib/validations/onboarding"
import { useCountries, useVendorTypes, useCreateApplication } from "@/lib/queries/onboarding"
import { ClientApiError } from "@/lib/api/client"

export function GetStartedForm() {
  const router = useRouter()
  const { data: countries, isLoading: countriesLoading } = useCountries()
  const {
    watch,
    setValue,
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<GetStartedInput>({
    resolver: zodResolver(getStartedSchema),
  })

  const countryId = watch("countryId")
  const vendorTypeId = watch("vendorTypeId")
  const { data: vendorTypes, isLoading: vendorTypesLoading } = useVendorTypes(countryId)
  const createApplication = useCreateApplication()

  const selectedVendorType = vendorTypes?.find((v) => v.id === vendorTypeId)
  const needsOtherType = selectedVendorType?.name.toLowerCase() === "other"

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createApplication.mutateAsync(values)
      router.push("/onboarding/requirements")
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Couldn't start your application. Try again.")
    }
  })

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <SearchableCombobox
              aria-label="Country"
              options={(countries ?? []).map((c) => ({ value: c.id, label: c.name }))}
              value={countryId}
              onChange={(value) => {
                setValue("countryId", value, { shouldValidate: true })
                setValue("vendorTypeId", "", { shouldValidate: false })
              }}
              placeholder="Select your country"
              searchPlaceholder="Search countries..."
              emptyText="No active countries found."
              loading={countriesLoading}
            />
            {errors.countryId && <p className="text-sm text-destructive">{errors.countryId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendorType">Business type</Label>
            <SearchableCombobox
              aria-label="Business type"
              options={(vendorTypes ?? []).map((v) => ({ value: v.id, label: v.name, description: v.description ?? undefined }))}
              value={vendorTypeId}
              onChange={(value) => setValue("vendorTypeId", value, { shouldValidate: true })}
              placeholder={countryId ? "Select your business type" : "Select a country first"}
              searchPlaceholder="Search business types..."
              emptyText="No business types available for this country yet."
              disabled={!countryId}
              loading={vendorTypesLoading}
            />
            {errors.vendorTypeId && <p className="text-sm text-destructive">{errors.vendorTypeId.message}</p>}
          </div>

          {needsOtherType && (
            <div className="space-y-2">
              <Label htmlFor="otherVendorType">Tell us more about your business type</Label>
              <Input id="otherVendorType" placeholder="e.g. Ghost kitchen, catering co-op" {...register("otherVendorType")} />
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Starting your application..." : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
