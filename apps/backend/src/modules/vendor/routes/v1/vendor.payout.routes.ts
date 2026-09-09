import { Router } from "express"
import {
  handleGetAvailablePayoutMethods,
  handleListPayoutAccounts,
  handleGetPayoutAccount,
  handleAddPayoutAccount,
  handleSetDefaultPayoutAccount,
  handleRemovePayoutAccount,
  handleListSupportedBanks,
  handleGetPayoutVerificationRequirement,
  handlePresignPayoutProof,
} from "../../controllers/vendor.payout.controller"

const payoutRouter: Router = Router()

//* /api/vendors/v1/payout

//* Available methods the vendor can choose from (driven by their country)
payoutRouter.get("/methods", handleGetAvailablePayoutMethods)

//* Supported banks for the vendor's own country/active provider (Vendor 1E)
payoutRouter.get("/banks", handleListSupportedBanks)

//* How this vendor's country verifies bank accounts (PROVIDER vs MANUAL) and,
//* in MANUAL mode, the proof document to upload + the presign for it. The two
//* verification paths are separate — presign refuses in a PROVIDER country.
payoutRouter.get("/verification-requirement", handleGetPayoutVerificationRequirement)
payoutRouter.post("/proof/presign",           handlePresignPayoutProof)

//* Vendor's registered payout accounts
payoutRouter.get("/accounts",     handleListPayoutAccounts)
payoutRouter.post("/accounts",    handleAddPayoutAccount)
payoutRouter.get("/accounts/:id", handleGetPayoutAccount)

payoutRouter.post("/accounts/:id/set-default", handleSetDefaultPayoutAccount)
payoutRouter.delete("/accounts/:id",           handleRemovePayoutAccount)

export default payoutRouter