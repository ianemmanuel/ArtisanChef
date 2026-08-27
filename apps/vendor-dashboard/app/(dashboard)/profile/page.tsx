import { PageHeader } from "@/components/dashboard/layout/PageHeader"
import { PageGrid } from "@/components/dashboard/layout/DashboardShell"
import { GoLiveCard } from "@/components/profile/GoLiveCard"
import { ProfileForm } from "@/components/profile/ProfileForm"

export default function ProfilePage() {
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
