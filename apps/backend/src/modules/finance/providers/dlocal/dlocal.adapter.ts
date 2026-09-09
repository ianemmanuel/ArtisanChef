/*
 * The concrete dLocal adapter. Implements ONLY the bank-account-resolution
 * capability (dLocal's account-validation endpoint) — the first real
 * provider for BANK_ACCOUNT_RESOLUTION. Nothing else: dLocal's collection /
 * payout / refund rails are separate APIs and separate future phases; this
 * adapter deliberately does not claim them.
 *
 * The finance domain gets a PaymentProviderAdapter from the registry and
 * calls `bankResolution.resolveBankAccount` on it — it never imports this
 * file, never sees a dLocal URL, header, signature, payload, status code or
 * error. Stateless: environment + secrets arrive per call in
 * ProviderCallContext.
 *
 * Endpoint (classic API, version 2.1):
 *   POST {base}/payouts/validation/external-account
 *   base: TEST -> https://sandbox.dlocal.com , LIVE -> https://api.dlocal.com
 */

import { ProviderError } from "../provider.errors"
import type {
  PaymentProviderAdapter,
  ProviderCallContext,
  BankAccountResolutionCapability,
  ResolveBankAccountInput,
  NormalizedBankAccount,
} from "../provider.types"
import type { ProviderCapability } from "../provider.capabilities"
import { fetchDlocalHttpClient, type DlocalHttpClient } from "./dlocal.http"
import { readDlocalCredentials, DLOCAL_REQUIRED_SECRET_KEYS } from "./dlocal.credentials"
import { dlocalDate, dlocalAuthorizationHeader } from "./dlocal.signature"
import {
  buildAccountValidationBody,
  parseAccountValidationResponse,
  isDlocalSupportedCountry,
} from "./dlocal.accountValidation"
import {
  DLOCAL_PROVIDER_CODE,
  DLOCAL_API_BASE_URL,
  DLOCAL_API_VERSION,
  DLOCAL_ACCOUNT_VALIDATION_PATH,
  DLOCAL_USER_AGENT,
} from "./dlocal.constants"

const CAPABILITIES: ProviderCapability[] = ["BANK_ACCOUNT_RESOLUTION"]

export interface DlocalAdapterDeps {
  http?: DlocalHttpClient
}

export function createDlocalAdapter(deps: DlocalAdapterDeps = {}): PaymentProviderAdapter {
  const http = deps.http ?? fetchDlocalHttpClient

  const bankResolution: BankAccountResolutionCapability = {
    async resolveBankAccount(ctx: ProviderCallContext, input: ResolveBankAccountInput): Promise<NormalizedBankAccount> {
      // Fail fast (no network, no credential read) for a country dLocal's
      // account-validation endpoint doesn't cover — a CAPABILITY gap, not
      // evidence about the account, so the caller degrades to manual review.
      if (!isDlocalSupportedCountry(input.countryCode ?? "")) {
        throw new ProviderError(
          "UNSUPPORTED_CAPABILITY",
          `dLocal does not support bank-account validation for country "${input.countryCode || "?"}"`,
          DLOCAL_PROVIDER_CODE,
          { providerMessage: `account-validation country not supported: ${input.countryCode || "?"}` },
        )
      }

      // buildAccountValidationBody also throws UNSUPPORTED_CAPABILITY /
      // INVALID_REQUEST(field) with no network call.
      const bodyObj = buildAccountValidationBody(input)
      const body = JSON.stringify(bodyObj)

      const creds = readDlocalCredentials(ctx.secrets)
      const base = (creds.baseUrl || DLOCAL_API_BASE_URL[ctx.environment]).replace(/\/+$/, "")
      const xDate = dlocalDate()

      const res = await http.request({
        method: "POST",
        url: `${base}${DLOCAL_ACCOUNT_VALIDATION_PATH}`,
        headers: {
          "X-Date": xDate,
          "X-Login": creds.xLogin,
          "X-Trans-Key": creds.xTransKey,
          "X-Version": DLOCAL_API_VERSION,
          "User-Agent": DLOCAL_USER_AGENT,
          "Content-Type": "application/json",
          Authorization: dlocalAuthorizationHeader(creds.xLogin, xDate, creds.secretKey, body),
        },
        body,
      })

      return parseAccountValidationResponse(res.status, res.body, input)
    },
  }

  return {
    code: DLOCAL_PROVIDER_CODE,
    capabilities: new Set<ProviderCapability>(CAPABILITIES),
    requiredSecretKeys: [...DLOCAL_REQUIRED_SECRET_KEYS],
    bankResolution,
  }
}
