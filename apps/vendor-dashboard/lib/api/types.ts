//* Response shapes that don't have a single existing @repo/types entry
//* because they're a composite of several — mirrors exactly what
//* previewApplication() returns in vendor.application.service.ts.
import type { VendorApplicationDetail, DocumentRequirement, DocumentProgress } from "@repo/types/vendor-app"

export interface ApplicationPreview {
  application: VendorApplicationDetail
  requirements: DocumentRequirement[]
  progress: DocumentProgress
  missingRequired: string[]
  missingFields: string[]
  canSubmit: boolean
}
