import { Router } from "express"
import { generateFileUploadUrl } from "../../controllers/storageBucket"

const storageBucketRouter: Router = Router()

storageBucketRouter.post("/presign", generateFileUploadUrl)

export default storageBucketRouter