"use client"

import * as React from "react"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useVendorProfile, useUpsertVendorProfile } from "@/lib/queries/profile"
import { ClientApiError } from "@/lib/api/client"
import { Skeleton } from "@/components/ui/skeleton"
import type { UpsertVendorProfileRequest } from "@repo/types/vendor-app"

const EMPTY_FORM: UpsertVendorProfileRequest = {
  displayName: "", tagline: "", description: "", story: "",
  logoUrl: "", coverImageUrl: "", publicEmail: "", publicPhone: "", website: "", reservationLink: "",
  specialties: [], dietaryOptions: [], foundedYear: null,
}

function toCsv(values: string[] | undefined): string {
  return (values ?? []).join(", ")
}

function fromCsv(value: string): string[] {
  return value.split(",").map((v) => v.trim()).filter(Boolean)
}

export function ProfileForm() {
  const { data: profile, isLoading } = useVendorProfile()
  const upsert = useUpsertVendorProfile()

  const [form, setForm] = React.useState<UpsertVendorProfileRequest>(EMPTY_FORM)
  const [specialtiesInput, setSpecialtiesInput] = React.useState("")
  const [dietaryInput, setDietaryInput] = React.useState("")
  const hydrated = React.useRef(false)

  React.useEffect(() => {
    if (profile && !hydrated.current) {
      hydrated.current = true
      setForm({
        displayName: profile.displayName,
        tagline: profile.tagline ?? "",
        description: profile.description ?? "",
        story: profile.story ?? "",
        logoUrl: profile.logoUrl ?? "",
        coverImageUrl: profile.coverImageUrl ?? "",
        publicEmail: profile.publicEmail ?? "",
        publicPhone: profile.publicPhone ?? "",
        website: profile.website ?? "",
        reservationLink: profile.reservationLink ?? "",
        specialties: profile.specialties,
        dietaryOptions: profile.dietaryOptions,
        foundedYear: profile.foundedYear,
      })
      setSpecialtiesInput(toCsv(profile.specialties))
      setDietaryInput(toCsv(profile.dietaryOptions))
    }
  }, [profile])

  function setField<K extends keyof UpsertVendorProfileRequest>(key: K, value: UpsertVendorProfileRequest[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.displayName?.trim()) { toast.error("Display name is required"); return }

    try {
      await upsert.mutateAsync({
        ...form,
        specialties: fromCsv(specialtiesInput),
        dietaryOptions: fromCsv(dietaryInput),
      })
      toast.success("Profile saved")
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Failed to save profile")
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basics</CardTitle>
          <CardDescription>What customers see first.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Display name</Label>
            <Input value={form.displayName} onChange={(e) => setField("displayName", e.target.value)} placeholder="Your public business name" />
          </div>
          <div className="space-y-1.5">
            <Label>Tagline</Label>
            <Input value={form.tagline ?? ""} onChange={(e) => setField("tagline", e.target.value)} placeholder='A one-line hook, e.g. "Authentic Ethiopian home cooking"' />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => setField("description", e.target.value)} rows={3} placeholder="What you serve and what makes you different" />
          </div>
          <div className="space-y-1.5">
            <Label>Story</Label>
            <Textarea value={form.story ?? ""} onChange={(e) => setField("story", e.target.value)} rows={4} placeholder="Your background, why you started" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Media</CardTitle>
          <CardDescription>Image URLs — upload hosting isn't wired up yet, so paste a hosted link for now.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Logo URL</Label>
            <Input value={form.logoUrl ?? ""} onChange={(e) => setField("logoUrl", e.target.value)} placeholder="https://…" />
          </div>
          <div className="space-y-1.5">
            <Label>Cover image URL</Label>
            <Input value={form.coverImageUrl ?? ""} onChange={(e) => setField("coverImageUrl", e.target.value)} placeholder="https://…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact & links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Public email</Label>
            <Input type="email" value={form.publicEmail ?? ""} onChange={(e) => setField("publicEmail", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Public phone</Label>
            <Input value={form.publicPhone ?? ""} onChange={(e) => setField("publicPhone", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input value={form.website ?? ""} onChange={(e) => setField("website", e.target.value)} placeholder="https://…" />
          </div>
          <div className="space-y-1.5">
            <Label>Reservation link</Label>
            <Input value={form.reservationLink ?? ""} onChange={(e) => setField("reservationLink", e.target.value)} placeholder="https://…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Specialties</Label>
            <Input value={specialtiesInput} onChange={(e) => setSpecialtiesInput(e.target.value)} placeholder="Comma-separated, e.g. Injera, Vegan platters" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Dietary options</Label>
            <Input value={dietaryInput} onChange={(e) => setDietaryInput(e.target.value)} placeholder="Comma-separated, e.g. Vegan, Halal, Gluten-free" />
          </div>
          <div className="space-y-1.5">
            <Label>Founded year</Label>
            <Input
              type="number"
              value={form.foundedYear ?? ""}
              onChange={(e) => setField("foundedYear", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={upsert.isPending}>
        {upsert.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save profile
      </Button>
    </form>
  )
}
