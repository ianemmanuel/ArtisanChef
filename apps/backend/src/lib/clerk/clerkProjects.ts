import { env } from "@/env"

export type ClerkAppType = "customer" | "vendor" | "courier" | "admin"

export function getClerkProjects(): Record<ClerkAppType, {
  issuer: string
  jwksUrl: string
}> {
  return {
    customer: {
      issuer : env.CLERK_CUSTOMER_ISSUER,
      jwksUrl: env.CLERK_CUSTOMER_JWKS_URL,
    },
    vendor: {
      issuer : env.CLERK_VENDOR_ISSUER,
      jwksUrl: env.CLERK_VENDOR_JWKS_URL,
    },
    courier: {
      issuer : env.CLERK_COURIER_ISSUER,
      jwksUrl: env.CLERK_COURIER_JWKS_URL,
    },
    admin: {
      issuer : env.CLERK_ADMIN_ISSUER,
      jwksUrl: env.CLERK_ADMIN_JWKS_URL,
    },
  }
}