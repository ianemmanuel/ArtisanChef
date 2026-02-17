import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import crypto from "crypto"

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!
const UPLOAD_EXPIRY = Number(process.env.R2_UPLOAD_EXPIRY_SECONDS ?? 300)
const VIEW_EXPIRY = Number(process.env.R2_VIEW_EXPIRY_SECONDS ?? 120)

export const R2Service = {
  generateStorageKey(
    applicationId: string,
    documentTypeId: string,
    extension: string
  ) {
    const uuid = crypto.randomUUID()

    return `vendor-applications/${applicationId}/documents/${documentTypeId}/${uuid}.${extension}`
  },

  async generateUploadUrl(storageKey: string, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: storageKey,
      ContentType: contentType,
    })

    return getSignedUrl(r2, command, {
      expiresIn: UPLOAD_EXPIRY,
    })
  },

  async generateViewUrl(storageKey: string) {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: storageKey,
    })

    return getSignedUrl(r2, command, {
      expiresIn: VIEW_EXPIRY,
    })
  },

  async deleteObject(storageKey: string) {
    await r2.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: storageKey,
      })
    )
  },

  async objectExists(storageKey: string) {
    try {
      await r2.send(
        new HeadObjectCommand({
          Bucket: BUCKET,
          Key: storageKey,
        })
      )
      return true
    } catch {
      return false
    }
  },
}
