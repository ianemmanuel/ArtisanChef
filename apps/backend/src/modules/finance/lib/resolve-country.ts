/*
 * The finance module resolves a country :ref exactly like the rest of the
 * admin plane — via the single shared helper. Kept as a re-export so
 * existing finance imports (`../lib/resolve-country`) don't churn.
 */
export { resolveCountryIdInScope } from "@/modules/admin/lib/scope/resolve-country-id"
