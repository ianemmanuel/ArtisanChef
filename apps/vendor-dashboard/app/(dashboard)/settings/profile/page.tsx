import { PageHeader } from "@/components/dashboard/layout/PageHeader"
import { PageGrid } from "@/components/dashboard/layout/DashboardShell"
import { GoLiveCard } from "@/components/profile/GoLiveCard"
import { ProfileForm } from "@/components/profile/ProfileForm"
import { requireSetupAccess } from "@/lib/vendor/guards"

export default async function ProfilePage() {
  await requireSetupAccess()

  return (
    <PageGrid>
      <PageHeader
        title="Public profile"
        description="How customers see your business once you're live."
      />
      <GoLiveCard />
      <ProfileForm />
    </PageGrid>
  )
}
