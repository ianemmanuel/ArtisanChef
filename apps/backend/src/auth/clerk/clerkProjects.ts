
export type ClerkAppType = "customer" | "vendor" | "courier" | "admin"

export const CLERK_PROJECTS: Record<ClerkAppType, {
  issuer: string
  jwksUrl: string
}> = {
  customer: {
    issuer: process.env.CLERK_CUSTOMER_ISSUER!,
    jwksUrl: process.env.CLERK_CUSTOMER_JWKS_URL!,
  },
  vendor: {
    issuer: process.env.CLERK_VENDOR_ISSUER!,
    jwksUrl: process.env.CLERK_VENDOR_JWKS_URL!,
  },
  courier: {
    issuer: process.env.CLERK_COURIER_ISSUER!,
    jwksUrl: process.env.CLERK_COURIER_JWKS_URL!,
  },
  admin: {
    issuer: process.env.CLERK_ADMIN_ISSUER!,
    jwksUrl: process.env.CLERK_ADMIN_JWKS_URL!,
  },
}
