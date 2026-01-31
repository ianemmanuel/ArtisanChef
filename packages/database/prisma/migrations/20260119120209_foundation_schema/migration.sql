-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "VendorTypeStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VendorApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OutletAdminStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'CHEF', 'STAFF');

-- CreateEnum
CREATE TYPE "DocumentScope" AS ENUM ('VENDOR', 'OUTLET');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'SUPERSEDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "GeoStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OutletAdminActionType" AS ENUM ('CREATED', 'UPDATED', 'SUSPENDED', 'UNSUSPENDED', 'BANNED', 'UNBANNED', 'FEATURED', 'UNFEATURED');

-- CreateEnum
CREATE TYPE "CuisineStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('BANK_TRANSFER', 'MOBILE_MONEY', 'PAYPAL', 'STRIPE');

-- CreateEnum
CREATE TYPE "PayoutTypeStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MealStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "DocumentTypeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DEPRECATED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "VendorUser" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumerAccount" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "mainImage" TEXT,
    "images" TEXT[],
    "portionSize" TEXT,
    "dietaryOptions" TEXT[],
    "specialties" TEXT[],
    "adminStatus" "MealStatus" NOT NULL DEFAULT 'ACTIVE',
    "adminSuspendedAt" TIMESTAMP(3),
    "adminBannedAt" TIMESTAMP(3),
    "adminUpdatedAt" TIMESTAMP(3),
    "adminUpdatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "vendorUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "images" TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "adminStatus" "MealStatus" NOT NULL DEFAULT 'ACTIVE',
    "adminSuspendedAt" TIMESTAMP(3),
    "adminBannedAt" TIMESTAMP(3),
    "adminUpdatedAt" TIMESTAMP(3),
    "adminUpdatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "vendorUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealCuisine" (
    "mealId" TEXT NOT NULL,
    "cuisineId" TEXT NOT NULL,

    CONSTRAINT "MealCuisine_pkey" PRIMARY KEY ("mealId","cuisineId")
);

-- CreateTable
CREATE TABLE "MealPlanMeal" (
    "mealPlanId" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,

    CONSTRAINT "MealPlanMeal_pkey" PRIMARY KEY ("mealPlanId","mealId")
);

-- CreateTable
CREATE TABLE "Cuisine" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CuisineStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdByAdminId" TEXT,
    "updatedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cuisine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutletCuisine" (
    "outletId" TEXT NOT NULL,
    "cuisineId" TEXT NOT NULL,

    CONSTRAINT "OutletCuisine_pkey" PRIMARY KEY ("outletId","cuisineId")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "phoneCode" TEXT NOT NULL,
    "status" "GeoStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByAdminId" TEXT,
    "updatedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "timezone" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" "GeoStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByAdminId" TEXT,
    "updatedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceArea" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "boundaries" JSONB NOT NULL,
    "status" "GeoStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByAdminId" TEXT,
    "updatedByAdminId" TEXT,

    CONSTRAINT "ServiceArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutletServiceArea" (
    "outletId" TEXT NOT NULL,
    "serviceAreaId" TEXT NOT NULL,

    CONSTRAINT "OutletServiceArea_pkey" PRIMARY KEY ("outletId","serviceAreaId")
);

-- CreateTable
CREATE TABLE "VendorTypeCountry" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "vendorTypeId" TEXT NOT NULL,
    "status" "GeoStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByAdminId" TEXT,
    "updatedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorTypeCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTypeConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "scope" "DocumentScope" NOT NULL,
    "isInheritable" BOOLEAN NOT NULL DEFAULT false,
    "countryId" TEXT NOT NULL,
    "cityId" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "requiresExpiry" BOOLEAN NOT NULL DEFAULT true,
    "expiryWarningDays" INTEGER NOT NULL DEFAULT 30,
    "instructions" TEXT,
    "sampleUrl" TEXT,
    "status" "DocumentTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByAdminId" TEXT,
    "updatedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTypeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTypeVendorType" (
    "id" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "vendorTypeId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTypeVendorType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "vendorId" TEXT,
    "documentTypeId" TEXT NOT NULL,
    "documentNumber" TEXT,
    "storageKey" TEXT NOT NULL,
    "documentName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "sourceApplicationId" TEXT,
    "reviewedByAdminId" TEXT,
    "rejectionReason" TEXT,
    "revisionNotes" TEXT,
    "supersededBy" TEXT,
    "supersededAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutletDocument" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "documentNumber" TEXT,
    "storageKey" TEXT NOT NULL,
    "documentName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "revisionNotes" TEXT,
    "supersededBy" TEXT,
    "supersededAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutletDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreDocumentInheritance" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "vendorDocumentId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "inheritedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StoreDocumentInheritance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "VendorTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdByAdminId" TEXT,
    "updatedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "vendorTypeId" TEXT NOT NULL,
    "otherVendorType" TEXT,
    "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "applicationId" TEXT,
    "countryId" TEXT NOT NULL,
    "legalBusinessName" TEXT NOT NULL,
    "businessEmail" TEXT NOT NULL,
    "businessPhone" TEXT NOT NULL,
    "companyRegNumber" TEXT,
    "taxRegistrationNumber" TEXT,
    "taxIdType" TEXT,
    "ownerFirstName" TEXT NOT NULL,
    "ownerLastName" TEXT NOT NULL,
    "ownerPhone" TEXT,
    "ownerEmail" TEXT,
    "businessAddress" TEXT NOT NULL,
    "addressLine2" TEXT,
    "postalCode" TEXT,
    "addressVerified" BOOLEAN NOT NULL DEFAULT false,
    "suspensionReason" TEXT,
    "deactivatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspensionUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorProfile" (
    "id" TEXT NOT NULL,
    "vendorAccountId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "story" TEXT,
    "logoUrl" TEXT,
    "coverImageUrl" TEXT,
    "publicEmail" TEXT,
    "publicPhone" TEXT,
    "website" TEXT,
    "socialLinks" JSONB,
    "reservationLink" TEXT,
    "primaryCuisineId" TEXT,
    "specialties" TEXT[],
    "dietaryOptions" TEXT[],
    "foundedYear" INTEGER,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isVerifiedBadge" BOOLEAN NOT NULL DEFAULT false,
    "isTopRated" BOOLEAN NOT NULL DEFAULT false,
    "isCommunityFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "galleryImages" TEXT[],
    "videoUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "VendorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "countryId" TEXT NOT NULL,
    "vendorTypeId" TEXT NOT NULL,
    "otherVendorType" TEXT,
    "legalBusinessName" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "taxId" TEXT,
    "businessEmail" TEXT NOT NULL,
    "businessPhone" TEXT,
    "ownerFirstName" TEXT NOT NULL,
    "ownerLastName" TEXT NOT NULL,
    "ownerPhone" TEXT,
    "ownerEmail" TEXT,
    "businessAddress" TEXT NOT NULL,
    "addressLine2" TEXT,
    "postalCode" TEXT,
    "status" "VendorApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "vendorAccountId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "reviewedBy" TEXT,
    "revisionCount" INTEGER NOT NULL DEFAULT 0,
    "rejectionReason" TEXT,
    "revisionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PayoutTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdByAdminId" TEXT,
    "updatedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryPayoutType" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "payoutTypeId" TEXT NOT NULL,
    "status" "GeoStatus" NOT NULL DEFAULT 'ACTIVE',
    "currency" TEXT,
    "minPayoutAmount" DOUBLE PRECISION,
    "maxPayoutAmount" DOUBLE PRECISION,
    "processingDays" INTEGER,
    "createdByAdminId" TEXT,
    "updatedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryPayoutType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPayoutAccount" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "countryPayoutTypeId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "bankName" TEXT,
    "branchName" TEXT,
    "bankCode" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "swiftCode" TEXT,
    "iban" TEXT,
    "routingNumber" TEXT,
    "mobileNetwork" TEXT,
    "mobileNumber" TEXT,
    "mobileWallet" TEXT,
    "paypalEmail" TEXT,
    "stripeAccountId" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verificationSource" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorPayoutAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outlet" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "coverBanner" TEXT,
    "images" TEXT[],
    "cityId" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "postalCode" TEXT,
    "neighborhood" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "deliveryRadius" DOUBLE PRECISION,
    "deliveryZones" JSONB,
    "deliveryFee" DOUBLE PRECISION,
    "minimumOrder" DOUBLE PRECISION,
    "phone" TEXT,
    "email" TEXT,
    "isMainStore" BOOLEAN NOT NULL DEFAULT false,
    "ratings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "adminStatus" "OutletAdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "adminSuspendedAt" TIMESTAMP(3),
    "adminSuspendUntil" TIMESTAMP(3),
    "adminBannedAt" TIMESTAMP(3),
    "adminUpdatedAt" TIMESTAMP(3),
    "adminUpdatedById" TEXT,
    "vendorDisabledAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "vendorUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutletOperatingHours" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutletOperatingHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutletAdminActivityLog" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" "OutletAdminActionType" NOT NULL,
    "reasonId" TEXT,
    "otherReason" TEXT,
    "previousStatus" "OutletAdminStatus",
    "newStatus" "OutletAdminStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutletAdminActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutletAdminActionReason" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "appliesTo" "OutletAdminActionType"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutletAdminActionReason_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorUser_clerkId_key" ON "VendorUser"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorUser_email_key" ON "VendorUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumerAccount_clerkId_key" ON "ConsumerAccount"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumerAccount_email_key" ON "ConsumerAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "Meal_outletId_idx" ON "Meal"("outletId");

-- CreateIndex
CREATE INDEX "Meal_adminStatus_idx" ON "Meal"("adminStatus");

-- CreateIndex
CREATE INDEX "Meal_deletedAt_idx" ON "Meal"("deletedAt");

-- CreateIndex
CREATE INDEX "Meal_createdAt_idx" ON "Meal"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Meal_outletId_name_key" ON "Meal"("outletId", "name");

-- CreateIndex
CREATE INDEX "MealPlan_outletId_idx" ON "MealPlan"("outletId");

-- CreateIndex
CREATE INDEX "MealPlan_adminStatus_idx" ON "MealPlan"("adminStatus");

-- CreateIndex
CREATE INDEX "MealPlan_deletedAt_idx" ON "MealPlan"("deletedAt");

-- CreateIndex
CREATE INDEX "MealPlan_createdAt_idx" ON "MealPlan"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_outletId_name_key" ON "MealPlan"("outletId", "name");

-- CreateIndex
CREATE INDEX "MealCuisine_cuisineId_idx" ON "MealCuisine"("cuisineId");

-- CreateIndex
CREATE INDEX "MealPlanMeal_mealId_idx" ON "MealPlanMeal"("mealId");

-- CreateIndex
CREATE UNIQUE INDEX "Cuisine_code_key" ON "Cuisine"("code");

-- CreateIndex
CREATE INDEX "Cuisine_status_idx" ON "Cuisine"("status");

-- CreateIndex
CREATE INDEX "Cuisine_deletedAt_idx" ON "Cuisine"("deletedAt");

-- CreateIndex
CREATE INDEX "OutletCuisine_cuisineId_idx" ON "OutletCuisine"("cuisineId");

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE INDEX "Country_status_idx" ON "Country"("status");

-- CreateIndex
CREATE INDEX "City_countryId_idx" ON "City"("countryId");

-- CreateIndex
CREATE INDEX "City_status_idx" ON "City"("status");

-- CreateIndex
CREATE UNIQUE INDEX "City_countryId_name_key" ON "City"("countryId", "name");

-- CreateIndex
CREATE INDEX "ServiceArea_cityId_idx" ON "ServiceArea"("cityId");

-- CreateIndex
CREATE INDEX "ServiceArea_status_idx" ON "ServiceArea"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceArea_cityId_name_key" ON "ServiceArea"("cityId", "name");

-- CreateIndex
CREATE INDEX "OutletServiceArea_serviceAreaId_idx" ON "OutletServiceArea"("serviceAreaId");

-- CreateIndex
CREATE INDEX "VendorTypeCountry_countryId_idx" ON "VendorTypeCountry"("countryId");

-- CreateIndex
CREATE INDEX "VendorTypeCountry_vendorTypeId_idx" ON "VendorTypeCountry"("vendorTypeId");

-- CreateIndex
CREATE INDEX "VendorTypeCountry_status_idx" ON "VendorTypeCountry"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VendorTypeCountry_countryId_vendorTypeId_key" ON "VendorTypeCountry"("countryId", "vendorTypeId");

-- CreateIndex
CREATE INDEX "DocumentTypeConfig_countryId_idx" ON "DocumentTypeConfig"("countryId");

-- CreateIndex
CREATE INDEX "DocumentTypeConfig_cityId_idx" ON "DocumentTypeConfig"("cityId");

-- CreateIndex
CREATE INDEX "DocumentTypeConfig_scope_countryId_cityId_idx" ON "DocumentTypeConfig"("scope", "countryId", "cityId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTypeConfig_code_countryId_cityId_key" ON "DocumentTypeConfig"("code", "countryId", "cityId");

-- CreateIndex
CREATE INDEX "DocumentTypeVendorType_documentTypeId_idx" ON "DocumentTypeVendorType"("documentTypeId");

-- CreateIndex
CREATE INDEX "DocumentTypeVendorType_vendorTypeId_idx" ON "DocumentTypeVendorType"("vendorTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTypeVendorType_documentTypeId_vendorTypeId_key" ON "DocumentTypeVendorType"("documentTypeId", "vendorTypeId");

-- CreateIndex
CREATE INDEX "VendorDocument_applicationId_idx" ON "VendorDocument"("applicationId");

-- CreateIndex
CREATE INDEX "VendorDocument_vendorId_idx" ON "VendorDocument"("vendorId");

-- CreateIndex
CREATE INDEX "VendorDocument_documentTypeId_idx" ON "VendorDocument"("documentTypeId");

-- CreateIndex
CREATE INDEX "VendorDocument_status_idx" ON "VendorDocument"("status");

-- CreateIndex
CREATE INDEX "VendorDocument_expiryDate_idx" ON "VendorDocument"("expiryDate");

-- CreateIndex
CREATE INDEX "OutletDocument_outletId_idx" ON "OutletDocument"("outletId");

-- CreateIndex
CREATE INDEX "OutletDocument_documentTypeId_idx" ON "OutletDocument"("documentTypeId");

-- CreateIndex
CREATE INDEX "OutletDocument_status_idx" ON "OutletDocument"("status");

-- CreateIndex
CREATE INDEX "OutletDocument_expiryDate_idx" ON "OutletDocument"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "OutletDocument_outletId_documentTypeId_supersededAt_key" ON "OutletDocument"("outletId", "documentTypeId", "supersededAt");

-- CreateIndex
CREATE INDEX "StoreDocumentInheritance_storeId_idx" ON "StoreDocumentInheritance"("storeId");

-- CreateIndex
CREATE INDEX "StoreDocumentInheritance_vendorDocumentId_idx" ON "StoreDocumentInheritance"("vendorDocumentId");

-- CreateIndex
CREATE INDEX "StoreDocumentInheritance_documentTypeId_idx" ON "StoreDocumentInheritance"("documentTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreDocumentInheritance_storeId_documentTypeId_key" ON "StoreDocumentInheritance"("storeId", "documentTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorType_name_key" ON "VendorType"("name");

-- CreateIndex
CREATE INDEX "VendorType_status_idx" ON "VendorType"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VendorAccount_userId_key" ON "VendorAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorAccount_applicationId_key" ON "VendorAccount"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorAccount_businessEmail_key" ON "VendorAccount"("businessEmail");

-- CreateIndex
CREATE INDEX "VendorAccount_userId_idx" ON "VendorAccount"("userId");

-- CreateIndex
CREATE INDEX "VendorAccount_countryId_idx" ON "VendorAccount"("countryId");

-- CreateIndex
CREATE INDEX "VendorAccount_status_idx" ON "VendorAccount"("status");

-- CreateIndex
CREATE INDEX "VendorAccount_businessEmail_idx" ON "VendorAccount"("businessEmail");

-- CreateIndex
CREATE INDEX "VendorAccount_businessPhone_idx" ON "VendorAccount"("businessPhone");

-- CreateIndex
CREATE INDEX "VendorAccount_createdAt_idx" ON "VendorAccount"("createdAt");

-- CreateIndex
CREATE INDEX "VendorAccount_deletedAt_idx" ON "VendorAccount"("deletedAt");

-- CreateIndex
CREATE INDEX "VendorAccount_countryId_status_idx" ON "VendorAccount"("countryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VendorAccount_userId_countryId_key" ON "VendorAccount"("userId", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorAccount_companyRegNumber_countryId_key" ON "VendorAccount"("companyRegNumber", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorAccount_taxRegistrationNumber_countryId_key" ON "VendorAccount"("taxRegistrationNumber", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorAccount_businessPhone_countryId_key" ON "VendorAccount"("businessPhone", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_vendorAccountId_key" ON "VendorProfile"("vendorAccountId");

-- CreateIndex
CREATE INDEX "VendorProfile_vendorAccountId_idx" ON "VendorProfile"("vendorAccountId");

-- CreateIndex
CREATE INDEX "VendorProfile_displayName_idx" ON "VendorProfile"("displayName");

-- CreateIndex
CREATE INDEX "VendorProfile_primaryCuisineId_idx" ON "VendorProfile"("primaryCuisineId");

-- CreateIndex
CREATE INDEX "VendorProfile_isPublished_idx" ON "VendorProfile"("isPublished");

-- CreateIndex
CREATE INDEX "VendorProfile_isFeatured_idx" ON "VendorProfile"("isFeatured");

-- CreateIndex
CREATE INDEX "VendorProfile_averageRating_idx" ON "VendorProfile"("averageRating");

-- CreateIndex
CREATE INDEX "VendorProfile_createdAt_idx" ON "VendorProfile"("createdAt");

-- CreateIndex
CREATE INDEX "VendorProfile_totalReviews_idx" ON "VendorProfile"("totalReviews");

-- CreateIndex
CREATE UNIQUE INDEX "VendorApplication_userId_key" ON "VendorApplication"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorApplication_vendorAccountId_key" ON "VendorApplication"("vendorAccountId");

-- CreateIndex
CREATE INDEX "VendorApplication_status_idx" ON "VendorApplication"("status");

-- CreateIndex
CREATE INDEX "VendorApplication_countryId_idx" ON "VendorApplication"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorApplication_userId_countryId_key" ON "VendorApplication"("userId", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutType_code_key" ON "PayoutType"("code");

-- CreateIndex
CREATE INDEX "PayoutType_status_idx" ON "PayoutType"("status");

-- CreateIndex
CREATE INDEX "CountryPayoutType_countryId_idx" ON "CountryPayoutType"("countryId");

-- CreateIndex
CREATE INDEX "CountryPayoutType_payoutTypeId_idx" ON "CountryPayoutType"("payoutTypeId");

-- CreateIndex
CREATE INDEX "CountryPayoutType_status_idx" ON "CountryPayoutType"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CountryPayoutType_countryId_payoutTypeId_key" ON "CountryPayoutType"("countryId", "payoutTypeId");

-- CreateIndex
CREATE INDEX "VendorPayoutAccount_vendorId_idx" ON "VendorPayoutAccount"("vendorId");

-- CreateIndex
CREATE INDEX "VendorPayoutAccount_countryPayoutTypeId_idx" ON "VendorPayoutAccount"("countryPayoutTypeId");

-- CreateIndex
CREATE INDEX "VendorPayoutAccount_isActive_idx" ON "VendorPayoutAccount"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Outlet_slug_key" ON "Outlet"("slug");

-- CreateIndex
CREATE INDEX "Outlet_vendorId_idx" ON "Outlet"("vendorId");

-- CreateIndex
CREATE INDEX "Outlet_cityId_idx" ON "Outlet"("cityId");

-- CreateIndex
CREATE INDEX "Outlet_slug_idx" ON "Outlet"("slug");

-- CreateIndex
CREATE INDEX "Outlet_adminStatus_idx" ON "Outlet"("adminStatus");

-- CreateIndex
CREATE INDEX "Outlet_latitude_longitude_idx" ON "Outlet"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "Outlet_vendorId_name_key" ON "Outlet"("vendorId", "name");

-- CreateIndex
CREATE INDEX "OutletOperatingHours_outletId_idx" ON "OutletOperatingHours"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "OutletOperatingHours_outletId_dayOfWeek_validFrom_key" ON "OutletOperatingHours"("outletId", "dayOfWeek", "validFrom");

-- CreateIndex
CREATE INDEX "OutletAdminActivityLog_outletId_idx" ON "OutletAdminActivityLog"("outletId");

-- CreateIndex
CREATE INDEX "OutletAdminActivityLog_adminId_idx" ON "OutletAdminActivityLog"("adminId");

-- CreateIndex
CREATE INDEX "OutletAdminActivityLog_action_idx" ON "OutletAdminActivityLog"("action");

-- CreateIndex
CREATE INDEX "OutletAdminActivityLog_createdAt_idx" ON "OutletAdminActivityLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OutletAdminActionReason_code_key" ON "OutletAdminActionReason"("code");

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_adminUpdatedById_fkey" FOREIGN KEY ("adminUpdatedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_adminUpdatedById_fkey" FOREIGN KEY ("adminUpdatedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealCuisine" ADD CONSTRAINT "MealCuisine_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealCuisine" ADD CONSTRAINT "MealCuisine_cuisineId_fkey" FOREIGN KEY ("cuisineId") REFERENCES "Cuisine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanMeal" ADD CONSTRAINT "MealPlanMeal_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanMeal" ADD CONSTRAINT "MealPlanMeal_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cuisine" ADD CONSTRAINT "Cuisine_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cuisine" ADD CONSTRAINT "Cuisine_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletCuisine" ADD CONSTRAINT "OutletCuisine_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletCuisine" ADD CONSTRAINT "OutletCuisine_cuisineId_fkey" FOREIGN KEY ("cuisineId") REFERENCES "Cuisine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Country" ADD CONSTRAINT "Country_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Country" ADD CONSTRAINT "Country_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceArea" ADD CONSTRAINT "ServiceArea_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceArea" ADD CONSTRAINT "ServiceArea_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceArea" ADD CONSTRAINT "ServiceArea_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletServiceArea" ADD CONSTRAINT "OutletServiceArea_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletServiceArea" ADD CONSTRAINT "OutletServiceArea_serviceAreaId_fkey" FOREIGN KEY ("serviceAreaId") REFERENCES "ServiceArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorTypeCountry" ADD CONSTRAINT "VendorTypeCountry_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorTypeCountry" ADD CONSTRAINT "VendorTypeCountry_vendorTypeId_fkey" FOREIGN KEY ("vendorTypeId") REFERENCES "VendorType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorTypeCountry" ADD CONSTRAINT "VendorTypeCountry_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorTypeCountry" ADD CONSTRAINT "VendorTypeCountry_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTypeConfig" ADD CONSTRAINT "DocumentTypeConfig_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTypeConfig" ADD CONSTRAINT "DocumentTypeConfig_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTypeConfig" ADD CONSTRAINT "DocumentTypeConfig_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTypeConfig" ADD CONSTRAINT "DocumentTypeConfig_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTypeVendorType" ADD CONSTRAINT "DocumentTypeVendorType_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentTypeConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTypeVendorType" ADD CONSTRAINT "DocumentTypeVendorType_vendorTypeId_fkey" FOREIGN KEY ("vendorTypeId") REFERENCES "VendorType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VendorApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentTypeConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletDocument" ADD CONSTRAINT "OutletDocument_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletDocument" ADD CONSTRAINT "OutletDocument_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentTypeConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletDocument" ADD CONSTRAINT "OutletDocument_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreDocumentInheritance" ADD CONSTRAINT "StoreDocumentInheritance_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreDocumentInheritance" ADD CONSTRAINT "StoreDocumentInheritance_vendorDocumentId_fkey" FOREIGN KEY ("vendorDocumentId") REFERENCES "VendorDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreDocumentInheritance" ADD CONSTRAINT "StoreDocumentInheritance_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentTypeConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorType" ADD CONSTRAINT "VendorType_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorType" ADD CONSTRAINT "VendorType_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAccount" ADD CONSTRAINT "VendorAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "VendorUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAccount" ADD CONSTRAINT "VendorAccount_vendorTypeId_fkey" FOREIGN KEY ("vendorTypeId") REFERENCES "VendorType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAccount" ADD CONSTRAINT "VendorAccount_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorProfile" ADD CONSTRAINT "VendorProfile_vendorAccountId_fkey" FOREIGN KEY ("vendorAccountId") REFERENCES "VendorAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorProfile" ADD CONSTRAINT "VendorProfile_primaryCuisineId_fkey" FOREIGN KEY ("primaryCuisineId") REFERENCES "Cuisine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorApplication" ADD CONSTRAINT "VendorApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "VendorUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorApplication" ADD CONSTRAINT "VendorApplication_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorApplication" ADD CONSTRAINT "VendorApplication_vendorTypeId_fkey" FOREIGN KEY ("vendorTypeId") REFERENCES "VendorType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorApplication" ADD CONSTRAINT "VendorApplication_vendorAccountId_fkey" FOREIGN KEY ("vendorAccountId") REFERENCES "VendorAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutType" ADD CONSTRAINT "PayoutType_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutType" ADD CONSTRAINT "PayoutType_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryPayoutType" ADD CONSTRAINT "CountryPayoutType_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryPayoutType" ADD CONSTRAINT "CountryPayoutType_payoutTypeId_fkey" FOREIGN KEY ("payoutTypeId") REFERENCES "PayoutType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryPayoutType" ADD CONSTRAINT "CountryPayoutType_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryPayoutType" ADD CONSTRAINT "CountryPayoutType_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayoutAccount" ADD CONSTRAINT "VendorPayoutAccount_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayoutAccount" ADD CONSTRAINT "VendorPayoutAccount_countryPayoutTypeId_fkey" FOREIGN KEY ("countryPayoutTypeId") REFERENCES "CountryPayoutType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_adminUpdatedById_fkey" FOREIGN KEY ("adminUpdatedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletOperatingHours" ADD CONSTRAINT "OutletOperatingHours_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletAdminActivityLog" ADD CONSTRAINT "OutletAdminActivityLog_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletAdminActivityLog" ADD CONSTRAINT "OutletAdminActivityLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletAdminActivityLog" ADD CONSTRAINT "OutletAdminActivityLog_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "OutletAdminActionReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;
