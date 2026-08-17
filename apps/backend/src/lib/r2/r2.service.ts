import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import crypto from "node:crypto"

import { env } from "@/env"

const r2 = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId    : env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
})

const BUCKET = env.R2_BUCKET_NAME
const UPLOAD_EXPIRY = env.R2_UPLOAD_EXPIRY_SECONDS
const VIEW_EXPIRY   = env.R2_VIEW_EXPIRY_SECONDS

export const R2Service = {
  //* Keyed by vendorUserId. 
   
  generateStorageKey(
    vendorUserId  : string,
    documentTypeId: string,
    extension     : string
  ) {
    const uuid = crypto.randomUUID()

    return `vendors/${vendorUserId}/documents/${documentTypeId}/${uuid}.${extension}`
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