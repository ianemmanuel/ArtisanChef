import { PageHeader } from "@/components/dashboard/layout/PageHeader"
import { PageGrid } from "@/components/dashboard/layout/DashboardShell"
import { AccountDocumentsSection } from "@/components/documents/AccountDocumentsSection"
import { requireSetupAccess } from "@/lib/vendor/guards"

export default async function DocumentsPage() {
  await requireSetupAccess()

  return (
    <PageGrid>
      <PageHeader
        title="Documents"
        description="Keep your business documents current — missing or expired ones can affect your account."
      />
      <AccountDocumentsSection />
    </PageGrid>
  )
}
