import Link from "next/link"
import { backendFetch } from "@/lib/api/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowRight, ClipboardList, FileCheck2 } from "lucide-react"
import type { VendorApplicationDetail, DocumentRequirementsResponse } from "@repo/types/vendor-app"

export default async function RequirementsPage() {
  const [application, docs] = await Promise.all([
    backendFetch<VendorApplicationDetail>("/vendor/v1/application/get"),
    backendFetch<DocumentRequirementsResponse>("/vendor/v1/documents/requirements", { revalidate: 120 }),
  ])

  const requiredDocs = docs.requirements.filter((r) => r.isRequired)
  const optionalDocs = docs.requirements.filter((r) => !r.isRequired)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary-subtle">
          <ClipboardList className="size-6 text-primary-subtle-fg" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
            Let&apos;s get you ready
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;re setting up a <span className="font-medium text-foreground">{application.vendorType.name}</span>{" "}
            business in <span className="font-medium text-foreground">{application.country.name}</span>. Here&apos;s
            everything worth having ready before you start.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents you&apos;ll need</CardTitle>
          <CardDescription>Required to submit your application for review.</CardDescription>
        </CardHeader>
        <CardContent>
          {requiredDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No specific documents are required to submit — you can add supporting documents any time.
            </p>
          ) : (
            <ul className="space-y-2">
              {requiredDocs.map((doc) => (
                <li key={doc.documentTypeId} className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
                  <FileCheck2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-sm text-foreground">{doc.name}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {optionalDocs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Good to have</CardTitle>
            <CardDescription>Optional — strengthens your application but isn&apos;t required to submit.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {optionalDocs.map((doc) => (
                <li key={doc.documentTypeId} className="flex items-start gap-3 rounded-lg border border-dashed border-border p-3">
                  <FileCheck2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{doc.name}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg bg-primary-subtle p-4 text-sm text-primary-subtle-fg">
        You can save your progress at any point and come back later — nothing needs to be finished in one sitting.
      </div>

      <div className="flex justify-end">
        <Button asChild size="lg">
          <Link href="/onboarding/business">
            Continue to application <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
