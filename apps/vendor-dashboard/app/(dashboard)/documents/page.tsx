import { PageHeader } from "@/components/dashboard/layout/PageHeader"
import { PageGrid } from "@/components/dashboard/layout/DashboardShell"
import { AccountDocumentsSection } from "@/components/documents/AccountDocumentsSection"

export default function DocumentsPage() {
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
