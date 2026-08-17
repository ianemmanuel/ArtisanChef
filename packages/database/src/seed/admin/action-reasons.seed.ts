import { prisma } from '../../index'

const ACTION_REASONS = [
    { 
        code: "POLICY_VIOLATION",    
        label: "Policy violation",         
        description: "Violated platform terms of service or operational policies.", 
        appliesTo: ["vendor_account.suspended", "outlet.suspended"] 
    },
    {   
        code: "QUALITY_ISSUES",
        label: "Quality issues",
        description: "Repeated complaints about food quality or hygiene.",            
        appliesTo: ["vendor_account.suspended", "outlet.suspended"] 
    },
    {   
        code: "SAFETY_CONCERN", 
        label: "Food safety concern",      
        description: "A food safety issue has been reported or identified.",          
        appliesTo: ["vendor_account.suspended", "meal.banned"] 
    },
    {   
        code: "FRAUDULENT_ACTIVITY", 
        label: "Fraudulent activity",      
        description: "Suspected or confirmed fraudulent behaviour.",                  
        appliesTo: ["vendor_account.suspended", "vendor_account.banned", "customer.suspended"] 
    },
    {   
        code: "DOCUMENT_ISSUES",     
        label: "Document issues",          
        description: "Documents are expired, invalid, or have not been submitted.",   
        appliesTo: ["vendor_account.suspended"] 
    },
    {
        code: "INCOMPLETE_DOCUMENTS",
        label: "Incomplete documents",
        description: "Required documents are missing or have not been uploaded.",
        appliesTo: ["vendor_application.rejected", "vendor_application.needs_revision"]
    },
    {
        code: "DOCUMENT_EXPIRED",
        label: "Expired documents",
        description: "One or more submitted documents have expired.",
        appliesTo: ["vendor_application.rejected", "vendor_application.needs_revision"]
    },
    {
        code: "INVALID_INFORMATION",
        label: "Invalid business info",
        description: "Business details cannot be verified or are inconsistent.",
        appliesTo: ["vendor_application.rejected", "vendor_application.needs_revision"]
    },
    {
        code: "INELIGIBLE_TYPE",
        label: "Vendor type not supported",
        description: "This vendor type is not supported in the selected country.",
        appliesTo: ["vendor_application.rejected"]
    },
    {
        code: "INVALID_BUSINESS_REGISTRATION",
        label: "Invalid Business Registration Document",
        description: "The submitted business registration document could not be verified.",
        appliesTo: ["vendor_application.needs_revision"]
    },
    {
        code: "TAX_DOCUMENT_UNCLEAR",
        label: "Tax Document Unclear",
        description: "The submitted tax document is illegible, incomplete, or does not match the business details provided.",
        appliesTo: ["vendor_application.needs_revision"]
    },
    { 
        code: "REFUND_POLICY",       
        label: "Refund per policy",        
        description: "Refund issued per platform refund policy.",                     
        appliesTo: ["customer.refund"] },
    {   
        code: "CUSTOMER_ABUSE",      
        label: "Abusive behaviour",        
        description: "Customer engaged in abuse towards vendors, couriers, or staff.",
        appliesTo: ["customer.suspended"] },
    {   
        code: "EMPLOYMENT_ENDED",    
        label: "Employment ended",         
        description: "Team member has left the organisation.",                        
        appliesTo: ["admin_user.deactivated"] 
    },
    {   
        code: "TEMPORARY_REVIEW",    
        label: "Temporary — under review", 
        description: "Account suspended pending investigation or review.",            
        appliesTo: ["admin_user.suspended", "vendor_account.suspended"] 
    },
] as const

/*
 * All seeded reasons here are global (countryId: null) — country-specific
 * reasons are admin-configured data, not seed data (see admin.actionReason
 * service). findFirst + create/update, not upsert — Prisma's compound
 * unique input type requires a non-null countryId even though the column
 * is nullable, same workaround as DocumentTypeConfig's seed/service.
 */
export async function seedActionReasons(): Promise<number> {
  for (const reason of ACTION_REASONS) {
    const existing = await prisma.adminActionReason.findFirst({
      where: { code: reason.code, countryId: null },
    })

    if (existing) {
      await prisma.adminActionReason.update({
        where: { id: existing.id },
        data : { label: reason.label, description: reason.description, appliesTo: [...reason.appliesTo] },
      })
    } else {
      await prisma.adminActionReason.create({
        data: { code: reason.code, label: reason.label, description: reason.description, appliesTo: [...reason.appliesTo] },
      })
    }
  }
  return ACTION_REASONS.length
}