/*
 * Deployment environment → allowed provider environment.
 *
 * A provider account carries its OWN environment (TEST | LIVE). The
 * application's NODE_ENV decides which one may be ACTIVE:
 *   production        → LIVE only
 *   development / test → TEST only
 *
 * This is a hard guard on activation — it prevents a dev/staging box from
 * ever activating LIVE provider credentials, and a production deploy from
 * running against a sandbox account. NOT a deployment-management system.
 *
 * Reads process.env.NODE_ENV directly (not the validated `env` object) so
 * this stays a zero-dependency leaf that unit tests can exercise without
 * booting the full env schema.
 */

export type ProviderEnvironment = "TEST" | "LIVE"

export function expectedProviderEnvironment(): ProviderEnvironment {
  return process.env.NODE_ENV === "production" ? "LIVE" : "TEST"
}

export function isEnvironmentActivatable(accountEnvironment: string): boolean {
  return accountEnvironment === expectedProviderEnvironment()
}
