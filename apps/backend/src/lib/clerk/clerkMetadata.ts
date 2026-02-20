import { createClerkClient } from "@clerk/backend"
import { VendorApplicationStatus } from "@repo/db"

const clerk = createClerkClient({
  secretKey: process.env.CLERK_VENDOR_SECRET_KEY!,
})

export class ClerkVendorStateService {
  static async setVendorApplicationStatus(
    clerkUserId: string,
    status: VendorApplicationStatus
  ) {
    await clerk.users.updateUser(clerkUserId, {
      publicMetadata: {
        vendorApplicationStatus: status,
      },
    })
  }

  static async clearVendorApplicationState(clerkUserId: string) {
    await clerk.users.updateUser(clerkUserId, {
      publicMetadata: {
        vendorApplicationStatus: null,
      },
    })
  }
}
