export const ROLES = [
  {
    name        : "super_admin",
    displayName : "Super Admin",
    description : "Full access to all modules and settings. Engineering and executive leadership only.",
  },
  {
    name        : "identity_admin",
    displayName : "Identity Admin",
    description : "Admin user management within assigned country. No access to business or financial data.",
  },
  {
    name        : "operations_admin",
    displayName : "Operations Admin",
    description : "Country launch configuration — activation readiness, vendor types, and document type requirements. Global scope only for now.",
  },
  {
    name        : "finance",
    displayName : "Finance",
    description : "Transactions, payouts, discounts, and revenue reporting.",
  },
  {
    name        : "vendor_ops",
    displayName : "Vendor Operations",
    description : "Vendor onboarding, application review, and account management within assigned country",
  },
  {
    name        : "customer_care",
    displayName : "Customer Care",
    description : "Customer accounts, order support, and refunds within assigned country",
  },
  {
    name        : "courier_ops",
    displayName : "Courier Operations",
    description : "Courier onboarding, dispatch management, and live delivery monitoring within assigned country",
  },
] as const