/**
 * Currency reference seed — ISO-4217. Deliberately NOT the full ~180-row
 * table: we seed the currencies for markets DailyBread is launching in or
 * near-term expanding to, plus the majors used for illustrative
 * cross-country reporting. Adding more later is a one-line data change +
 * re-seed (or the admin `finance:configuration:manage` API).
 *
 * `minorUnitDigits` is the real ISO-4217 value — NOT assumed to be 2.
 * UGX/RWF/XOF/XAF are genuine 0-digit currencies; getting this wrong
 * silently corrupts every amount, so it's data, checked by tests.
 */
export interface CurrencySeedRow {
  code: string
  name: string
  symbol: string
  minorUnitDigits: number
}

export const CURRENCIES: CurrencySeedRow[] = [
  // East Africa (launch + expansion)
  { code: "KES", name: "Kenyan Shilling",   symbol: "KSh",  minorUnitDigits: 2 },
  { code: "UGX", name: "Ugandan Shilling",  symbol: "USh",  minorUnitDigits: 0 },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", minorUnitDigits: 2 },
  { code: "RWF", name: "Rwandan Franc",     symbol: "FRw",  minorUnitDigits: 0 },
  { code: "ETB", name: "Ethiopian Birr",    symbol: "Br",   minorUnitDigits: 2 },
  // West / Central / North Africa
  { code: "NGN", name: "Nigerian Naira",    symbol: "₦", minorUnitDigits: 2 },
  { code: "GHS", name: "Ghanaian Cedi",     symbol: "₵", minorUnitDigits: 2 },
  { code: "XOF", name: "West African CFA Franc",   symbol: "CFA",  minorUnitDigits: 0 },
  { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA", minorUnitDigits: 0 },
  { code: "EGP", name: "Egyptian Pound",    symbol: "E£", minorUnitDigits: 2 },
  { code: "MAD", name: "Moroccan Dirham",   symbol: "DH",   minorUnitDigits: 2 },
  { code: "ZAR", name: "South African Rand", symbol: "R",   minorUnitDigits: 2 },
  // Reporting majors
  { code: "USD", name: "US Dollar",         symbol: "$",    minorUnitDigits: 2 },
  { code: "EUR", name: "Euro",              symbol: "€", minorUnitDigits: 2 },
  { code: "GBP", name: "Pound Sterling",    symbol: "£", minorUnitDigits: 2 },
]
