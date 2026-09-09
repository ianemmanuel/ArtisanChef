import { prisma } from '../../index'

/*
 * Bank-account verification mode for the launch country.
 *
 * Kenya has no payment provider that can resolve a bank account — confirmed
 * against dLocal (account validation covers AR/BD/CR/GH/GT/HN/IN/NG/TR/VN
 * only), Flutterwave (NGN only; KES returns "Invalid value 'KES' for
 * BankAccountCurrency"), Paystack (resolve is Nigeria + Ghana) and Fincra
 * (NGN/GHS/ZAR/IBAN). Nigeria has NIBSS name enquiry as an open rail;
 * Kenya's equivalent sits behind PesaLink's member banks.
 *
 * So Kenya verifies the way every marketplace operating there does: the
 * vendor uploads a stamped bank confirmation letter or a recent statement
 * showing the account holder's name and number, and an admin checks it
 * against the vendor's legal identity. This seed sets that mode and creates
 * the document type vendors are asked for.
 *
 * Idempotent, and deliberately conservative: it only switches a country to
 * MANUAL when that country has NO bank-verification provider account bound
 * (i.e. automatic verification was never actually possible there). A country
 * an admin has wired to a provider is left completely alone.
 */

const LAUNCH_COUNTRY_SLUG = 'ke'
const PROOF_TYPE_CODE = 'BANK_ACCOUNT_OWNERSHIP_PROOF'

export async function seedPayoutVerificationMode(): Promise<{ note: string }> {
  const country = await prisma.country.findUnique({
    where: { slug: LAUNCH_COUNTRY_SLUG },
    select: { id: true, name: true },
  })
  if (!country) return { note: `launch country "${LAUNCH_COUNTRY_SLUG}" not found — run the geography seed first` }

  const config = await prisma.countryFinancialConfig.findUnique({
    where: { countryId: country.id },
    select: { bankVerificationMode: true, bankVerificationProviderAccountId: true },
  })
  if (!config) return { note: `${country.name} has no financial config yet — nothing to set` }

  const notes: string[] = []

  // Only flip a country that genuinely has no automatic verification wired.
  if (config.bankVerificationProviderAccountId) {
    notes.push(`${country.name} has a bank-verification provider bound — mode left as ${config.bankVerificationMode}`)
  } else if (config.bankVerificationMode !== 'MANUAL') {
    await prisma.countryFinancialConfig.update({
      where: { countryId: country.id },
      data: { bankVerificationMode: 'MANUAL' },
    })
    notes.push(`${country.name} set to MANUAL bank verification`)
  } else {
    notes.push(`${country.name} already MANUAL`)
  }

  // The document vendors upload as proof. An ordinary DocumentTypeConfig —
  // admins can rename/retire it in the existing document-type UI.
  const existing = await prisma.documentTypeConfig.findFirst({
    where: { countryId: country.id, scope: 'PAYOUT_ACCOUNT' },
    select: { id: true },
  })
  if (existing) {
    notes.push('payout-account proof document type already exists')
  } else {
    await prisma.documentTypeConfig.create({
      data: {
        name: 'Bank Account Ownership Proof',
        code: PROOF_TYPE_CODE,
        description:
          'A stamped bank confirmation letter, or a recent bank statement, showing the account holder name and account number.',
        scope: 'PAYOUT_ACCOUNT',
        countryId: country.id,
        isRequired: true,
        // A bank letter doesn't expire the way a licence does — the account
        // is re-verified when the vendor changes it, not on a calendar.
        requiresExpiry: false,
        complianceSeverity: 'CRITICAL',
        instructions:
          'Upload a document from your bank that clearly shows your name (or your business name) and your account number, and is stamped by the bank. A recent bank statement or an official bank confirmation letter both work. Screenshots and handwritten documents are not accepted.',
      },
    })
    notes.push('created payout-account proof document type')
  }

  return { note: notes.join('; ') }
}
