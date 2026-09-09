import { describe, it, expect } from "vitest"
import { createFlutterwaveAdapter } from "./flutterwave.adapter"
import { FlutterwaveTokenManager } from "./flutterwave.token"
import type { FlutterwaveHttpClient, FlutterwaveHttpRequest, FlutterwaveHttpResponse } from "./flutterwave.http"
import type { ProviderCallContext } from "../provider.types"
import { money } from "../../lib/money"

/*
 * Every test injects a fake HTTP client — NO test touches the network or the
 * real Flutterwave API (spec §20). The request/response shapes asserted here
 * were verified against the real v4 sandbox during Phase 1C verification.
 */

interface Stub {
  match: (req: FlutterwaveHttpRequest) => boolean
  respond: FlutterwaveHttpResponse | ((req: FlutterwaveHttpRequest) => FlutterwaveHttpResponse)
}

class FakeHttp implements FlutterwaveHttpClient {
  readonly calls: FlutterwaveHttpRequest[] = []
  constructor(private stubs: Stub[]) {}
  async request(req: FlutterwaveHttpRequest): Promise<FlutterwaveHttpResponse> {
    this.calls.push(req)
    const stub = this.stubs.find((s) => s.match(req))
    if (!stub) throw new Error(`no stub for ${req.method} ${req.url}`)
    return typeof stub.respond === "function" ? stub.respond(req) : stub.respond
  }
}

const isToken = (r: FlutterwaveHttpRequest) => r.url.includes("openid-connect/token")
const tokenOk: Stub = { match: isToken, respond: { status: 200, body: { access_token: "tok_abc", expires_in: 600, token_type: "Bearer" } } }
const CHARGE_PATH = "/orchestration/direct-charges"

const CTX: ProviderCallContext = {
  environment: "TEST",
  secrets: { clientid: "cid", clientsecret: "csecret-should-never-leak", webhooksecrethash: "whs" },
  traceId: "verify-trace-1234", // >= 12 chars so it's used verbatim
}

const MM = { type: "MOBILE_MONEY" as const, countryCode: "254", network: "MPESA", phoneNumber: "700000000" }
const chargeInput = (over: Record<string, unknown> = {}) => ({
  amount: money(1000, "KES"),
  reference: "verifyref123",
  customerEmail: "c@example.com",
  paymentMethod: MM,
  ...over,
})

function build(stubs: Stub[]) {
  const http = new FakeHttp(stubs)
  const adapter = createFlutterwaveAdapter({ http, tokenManager: new FlutterwaveTokenManager(http) })
  return { http, adapter }
}

// v4 error envelope: { status: "failed", error: { type, code, message, validation_errors } }
const fwError = (type: string, message = "Request is not valid", validation: Array<{ field_name: string; message: string }> = []) => ({
  status: "failed",
  error: { type, code: "10400", message, validation_errors: validation },
})

describe("Flutterwave adapter — authentication", () => {
  it("acquires a bearer token and sends it as Authorization + a valid X-Trace-Id on the API call", async () => {
    const { http, adapter } = build([
      tokenOk,
      { match: (r) => r.url.includes(CHARGE_PATH) && r.method === "POST", respond: { status: 201, body: { data: { id: "chg_1", status: "pending" } } } },
    ])
    await adapter.collection!.createCharge(CTX, chargeInput())
    const apiCall = http.calls.find((c) => c.url.includes(CHARGE_PATH))!
    expect(apiCall.headers.authorization).toBe("Bearer tok_abc")
    expect(apiCall.headers["x-trace-id"]).toBe("verify-trace-1234")
  })

  it("replaces a too-short caller trace id with a generated one (Flutterwave requires 12–255)", async () => {
    const { http, adapter } = build([
      tokenOk,
      { match: (r) => r.url.includes(CHARGE_PATH), respond: { status: 201, body: { data: { id: "c", status: "pending" } } } },
    ])
    await adapter.collection!.createCharge({ ...CTX, traceId: "short" }, chargeInput())
    const t = http.calls.find((c) => c.url.includes(CHARGE_PATH))!.headers["x-trace-id"]
    expect(t.length).toBeGreaterThanOrEqual(12)
    expect(t).not.toBe("short")
  })

  it("reuses the cached token across calls (one token request for two API calls)", async () => {
    const { http, adapter } = build([
      tokenOk,
      { match: (r) => r.url.includes(CHARGE_PATH), respond: { status: 201, body: { data: { id: "c", status: "pending" } } } },
      { match: (r) => r.url.includes("/charges/c"), respond: { status: 200, body: { data: { id: "c", status: "succeeded" } } } },
    ])
    await adapter.collection!.createCharge(CTX, chargeInput())
    await adapter.collection!.verifyCharge(CTX, "c")
    expect(http.calls.filter(isToken)).toHaveLength(1)
  })

  it("normalizes an auth failure from the token endpoint to ProviderError(AUTHENTICATION)", async () => {
    const { adapter } = build([{ match: isToken, respond: { status: 401, body: { error: "invalid_client" } } }])
    await expect(adapter.collection!.createCharge(CTX, chargeInput())).rejects.toMatchObject({
      name: "ProviderError",
      category: "AUTHENTICATION",
    })
  })
})

describe("Flutterwave adapter — collection (POST /orchestration/direct-charges)", () => {
  it("builds the v4 body: inline customer + payment_method, amount in major units, no secret", async () => {
    const { http, adapter } = build([
      tokenOk,
      { match: (r) => r.url.includes(CHARGE_PATH), respond: { status: 201, body: { data: { id: "chg_9", status: "pending" } } } },
    ])
    await adapter.collection!.createCharge(CTX, chargeInput({ amount: money(150000, "KES"), customerName: "Jane Doe", customerPhone: "+254700111222" }))
    const body = http.calls.find((c) => c.url.includes(CHARGE_PATH))!.json as Record<string, unknown>
    expect(body.amount).toBe(1500)
    expect(body.currency).toBe("KES")
    expect((body.customer as Record<string, unknown>).email).toBe("c@example.com")
    expect((body.customer as { name: { first: string; last: string } }).name).toEqual({ first: "Jane", last: "Doe" })
    expect(body.payment_method).toEqual({
      type: "mobile_money",
      mobile_money: { country_code: "254", network: "MPESA", phone_number: "700000000" },
    })
    expect(JSON.stringify(body)).not.toContain("csecret-should-never-leak")
  })

  it("normalizes a pending mobile-money charge with a payment_instruction next action", async () => {
    const { adapter } = build([
      tokenOk,
      {
        match: (r) => r.url.includes(CHARGE_PATH),
        respond: {
          status: 201,
          body: {
            status: "success",
            message: "Charge created",
            data: {
              id: "chg_UzgRB85eUs",
              amount: 10,
              currency: "KES",
              status: "pending",
              fees: [{ type: "merchant", amount: 0.3 }, { type: "vat", amount: 0 }],
              next_action: { type: "payment_instruction", payment_instruction: { note: "Approve the M-Pesa prompt" } },
            },
          },
        },
      },
    ])
    const tx = await adapter.collection!.createCharge(CTX, chargeInput({ amount: money(1000, "KES") }))
    expect(tx.providerRef).toBe("chg_UzgRB85eUs")
    expect(tx.status).toBe("PENDING")
    expect(tx.amount).toEqual({ amountMinor: 1000, currency: "KES" })
    expect(tx.fee).toEqual({ amountMinor: 30, currency: "KES" })
    expect(tx.nextAction).toEqual({ type: "PAYMENT_INSTRUCTION", instruction: "Approve the M-Pesa prompt" })
  })

  it("normalizes a redirect next action (v4 shape: redirect_url is { url })", async () => {
    const { adapter } = build([
      tokenOk,
      {
        match: (r) => r.url.includes(CHARGE_PATH),
        respond: { status: 201, body: { data: { id: "c", status: "pending", next_action: { type: "redirect_url", redirect_url: { url: "https://pay.test/x" } } } } },
      },
    ])
    const tx = await adapter.collection!.createCharge(CTX, chargeInput())
    expect(tx.nextAction).toEqual({ type: "REDIRECT", redirectUrl: "https://pay.test/x" })
  })

  it("verifyCharge (GET /charges/{id}) maps 'succeeded' -> SUCCEEDED", async () => {
    const { adapter } = build([
      tokenOk,
      { match: (r) => r.url.includes("/charges/chg_1") && r.method === "GET", respond: { status: 200, body: { data: { id: "chg_1", status: "succeeded", amount: 20, currency: "KES" } } } },
    ])
    const tx = await adapter.collection!.verifyCharge(CTX, "chg_1")
    expect(tx.status).toBe("SUCCEEDED")
    expect(tx.amount).toEqual({ amountMinor: 2000, currency: "KES" })
  })

  it("parses the v4 error envelope (error.type + validation_errors) into a safe ProviderError", async () => {
    const { adapter } = build([
      tokenOk,
      {
        match: (r) => r.url.includes(CHARGE_PATH),
        respond: { status: 400, body: fwError("REQUEST_NOT_VALID", "Request is not valid", [{ field_name: "amount", message: "must not be null" }]) },
      },
    ])
    await expect(adapter.collection!.createCharge(CTX, chargeInput())).rejects.toMatchObject({
      name: "ProviderError",
      category: "INVALID_REQUEST",
      context: { httpStatus: 400 },
    })
  })

  it("maps 429 -> RATE_LIMIT and 503 -> PROVIDER_UNAVAILABLE", async () => {
    for (const [status, category] of [[429, "RATE_LIMIT"], [503, "PROVIDER_UNAVAILABLE"]] as const) {
      const { adapter } = build([
        tokenOk,
        { match: (r) => r.url.includes(CHARGE_PATH), respond: { status, body: {} } },
      ])
      await expect(adapter.collection!.createCharge(CTX, chargeInput())).rejects.toMatchObject({ category })
    }
  })
})

describe("Flutterwave adapter — refunds (POST /refunds)", () => {
  it("sends charge_id + amount + a v4 reason enum value", async () => {
    const { http, adapter } = build([
      tokenOk,
      { match: (r) => r.url.endsWith("/refunds") && r.method === "POST", respond: { status: 201, body: { data: { id: "rfd_1", status: "pending", amount_refunded: 5, currency: "KES" } } } },
    ])
    const r = await adapter.refunds!.refund(CTX, { providerRef: "chg_1", amount: money(500, "KES"), reason: "customer changed mind" })
    const body = http.calls.find((c) => c.url.endsWith("/refunds"))!.json as Record<string, unknown>
    expect(body.charge_id).toBe("chg_1")
    expect(body.amount).toBe(5)
    expect(["duplicate", "fraudulent", "requested_by_customer", "expired_uncaptured_charge"]).toContain(body.reason)
    expect(r.status).toBe("PENDING")
    expect(r.amount).toEqual({ amountMinor: 500, currency: "KES" })
  })
})

describe("Flutterwave adapter — payout (POST /direct-transfers)", () => {
  it("builds a v4 bank transfer body: type/action at top level, money+recipient under payment_instruction", async () => {
    const { http, adapter } = build([
      tokenOk,
      { match: (r) => r.url.endsWith("/direct-transfers") && r.method === "POST", respond: { status: 201, body: { data: { id: "trf_1", status: "NEW" } } } },
    ])
    const p = await adapter.payouts!.createPayout(CTX, {
      amount: money(500000, "KES"),
      reference: "po1",
      destination: { bankCode: "044", accountNumber: "0690000031", accountName: "Jane Doe" },
      narration: "vendor payout",
    })
    expect(p.providerRef).toBe("trf_1")
    expect(p.status).toBe("PENDING")
    const body = http.calls.find((c) => c.url.endsWith("/direct-transfers"))!.json as Record<string, unknown>
    expect(body.type).toBe("bank")
    expect(body.action).toBe("instant")
    const pi = body.payment_instruction as Record<string, unknown>
    expect((pi.amount as Record<string, unknown>).value).toBe(5000)
    expect(pi.source_currency).toBe("KES")
    const bank = (pi.recipient as Record<string, unknown>).bank as Record<string, unknown>
    expect(bank.code).toBe("044")
    expect("branch_code" in bank).toBe(false) // none supplied -> key omitted
  })

  it("includes recipient.bank.branch_code only when the destination carries one", async () => {
    const { http, adapter } = build([
      tokenOk,
      { match: (r) => r.url.endsWith("/direct-transfers") && r.method === "POST", respond: { status: 201, body: { data: { id: "trf_b", status: "NEW" } } } },
    ])
    await adapter.payouts!.createPayout(CTX, {
      amount: money(500000, "GHS"),
      reference: "po-branch",
      destination: { bankCode: "030100", accountNumber: "1234567890", accountName: "Kofi Mensah", branchCode: "030101" },
    })
    const body = http.calls.find((c) => c.url.endsWith("/direct-transfers"))!.json as Record<string, unknown>
    const bank = ((body.payment_instruction as Record<string, unknown>).recipient as Record<string, unknown>).bank as Record<string, unknown>
    expect(bank.branch_code).toBe("030101")
  })

  it("verifyPayout (GET /transfers/{id}) maps SUCCESSFUL -> PAID and reads amount.value", async () => {
    const { adapter } = build([
      tokenOk,
      { match: (r) => r.url.includes("/transfers/trf_1"), respond: { status: 200, body: { data: { id: "trf_1", status: "SUCCESSFUL", amount: { value: 50, applies_to: "destination_currency" }, currency: "KES" } } } },
    ])
    const p = await adapter.payouts!.verifyPayout(CTX, "trf_1")
    expect(p.status).toBe("PAID")
    expect(p.amount).toEqual({ amountMinor: 5000, currency: "KES" })
  })

  it("maps CANCELLED -> FAILED", async () => {
    const { adapter } = build([
      tokenOk,
      { match: (r) => r.url.includes("/transfers/trf_2"), respond: { status: 200, body: { data: { id: "trf_2", status: "CANCELLED" } } } },
    ])
    expect((await adapter.payouts!.verifyPayout(CTX, "trf_2")).status).toBe("FAILED")
  })
})

describe("Flutterwave adapter — bank account resolution (POST /banks/account-resolve)", () => {
  const RESOLVE_PATH = "/banks/account-resolve"

  it("sends the currency-discriminated body ({ currency, account: { code, number} }) and normalizes the result", async () => {
    const { http, adapter } = build([
      tokenOk,
      {
        match: (r) => r.url.includes(RESOLVE_PATH) && r.method === "POST",
        respond: { status: 200, body: { status: "success", message: "ok", data: { bank_code: "044", account_number: "0690000031", account_name: "JANE WANJIKU" } } },
      },
    ])
    const result = await adapter.bankResolution!.resolveBankAccount(CTX, { bankCode: "044", accountNumber: "0690000031", currency: "NGN", countryCode: "NG" })

    const call = http.calls.find((c) => c.url.includes(RESOLVE_PATH))!
    const body = call.json as Record<string, unknown>
    expect(body.currency).toBe("NGN")
    expect((body.account as Record<string, unknown>).code).toBe("044")
    expect((body.account as Record<string, unknown>).number).toBe("0690000031")

    expect(result).toEqual({ accountNumber: "0690000031", accountName: "JANE WANJIKU", bankCode: "044" })
  })

  it("fails fast (no network call) with UNSUPPORTED_CAPABILITY for a currency Flutterwave can't resolve (KES/GHS/…)", async () => {
    const { http, adapter } = build([tokenOk])
    await expect(
      adapter.bankResolution!.resolveBankAccount(CTX, { bankCode: "68", accountNumber: "1234567890", currency: "KES", countryCode: "KE" }),
    ).rejects.toMatchObject({ name: "ProviderError", category: "UNSUPPORTED_CAPABILITY" })
    // never even hit the endpoint
    expect(http.calls.some((c) => c.url.includes(RESOLVE_PATH))).toBe(false)
  })

  it("authenticates the same way as every other endpoint (bearer token + trace id)", async () => {
    const { http, adapter } = build([
      tokenOk,
      { match: (r) => r.url.includes(RESOLVE_PATH), respond: { status: 200, body: { data: { bank_code: "044", account_number: "1", account_name: "A" } } } },
    ])
    await adapter.bankResolution!.resolveBankAccount(CTX, { bankCode: "044", accountNumber: "1", currency: "NGN", countryCode: "NG" })
    const call = http.calls.find((c) => c.url.includes(RESOLVE_PATH))!
    expect(call.headers.authorization).toBe("Bearer tok_abc")
    expect(call.headers["x-trace-id"]).toBe("verify-trace-1234")
  })

  it("normalizes a 'not found' style failure to ProviderError(INVALID_REQUEST) via the standard error envelope", async () => {
    const { adapter } = build([
      tokenOk,
      {
        match: (r) => r.url.includes(RESOLVE_PATH),
        respond: { status: 400, body: fwError("RESOURCE_NOT_FOUND", "Account not found") },
      },
    ])
    await expect(
      adapter.bankResolution!.resolveBankAccount(CTX, { bankCode: "044", accountNumber: "0000000000", currency: "NGN", countryCode: "NG" }),
    ).rejects.toMatchObject({ name: "ProviderError", category: "INVALID_REQUEST" })
  })

  it("flags a field-level validation error so callers can tell a bad account from an ambiguous rejection", async () => {
    const { adapter } = build([
      tokenOk,
      {
        match: (r) => r.url.includes(RESOLVE_PATH),
        respond: { status: 400, body: { status: "failed", error: { type: "REQUEST_NOT_VALID", message: "Request is not valid", validation_errors: [{ field_name: "account.number", message: "size must be between 10 and 10" }] } } },
      },
    ])
    await expect(
      adapter.bankResolution!.resolveBankAccount(CTX, { bankCode: "044", accountNumber: "123", currency: "NGN", countryCode: "NG" }),
    ).rejects.toMatchObject({ category: "INVALID_REQUEST", context: { fieldValidation: true } })
  })

  it("maps a provider outage (5xx) to PROVIDER_UNAVAILABLE", async () => {
    const { adapter } = build([
      tokenOk,
      { match: (r) => r.url.includes(RESOLVE_PATH), respond: { status: 503, body: {} } },
    ])
    await expect(
      adapter.bankResolution!.resolveBankAccount(CTX, { bankCode: "044", accountNumber: "1", currency: "NGN", countryCode: "NG" }),
    ).rejects.toMatchObject({ category: "PROVIDER_UNAVAILABLE" })
  })

  it("maps an authentication failure to AUTHENTICATION", async () => {
    const { adapter } = build([
      tokenOk,
      { match: (r) => r.url.includes(RESOLVE_PATH), respond: { status: 401, body: fwError("UNAUTHORIZED", "Invalid credentials") } },
    ])
    await expect(
      adapter.bankResolution!.resolveBankAccount(CTX, { bankCode: "044", accountNumber: "1", currency: "NGN", countryCode: "NG" }),
    ).rejects.toMatchObject({ category: "AUTHENTICATION" })
  })

  it("never leaks the account number/bank code into the thrown error's message", async () => {
    const { adapter } = build([
      tokenOk,
      { match: (r) => r.url.includes(RESOLVE_PATH), respond: { status: 400, body: fwError("REQUEST_NOT_VALID", "Invalid account") } },
    ])
    try {
      await adapter.bankResolution!.resolveBankAccount(CTX, { bankCode: "044", accountNumber: "9999999999", currency: "NGN", countryCode: "NG" })
      throw new Error("expected rejection")
    } catch (err) {
      expect(String((err as Error).message)).not.toContain("9999999999")
    }
  })
})

describe("Flutterwave adapter — bank list (GET /banks)", () => {
  const isBankList = (r: FlutterwaveHttpRequest) => r.url.includes("/banks?")

  it("sends the ISO2 country as a query param and normalizes { id, code, name } -> { code, name }", async () => {
    const { http, adapter } = build([
      tokenOk,
      {
        match: isBankList,
        respond: { status: 200, body: { status: "success", message: "ok", data: [
          { id: "bnk_1", code: "044", name: "Access Bank" },
          { id: "bnk_2", code: "011", name: "First Bank" },
        ] } },
      },
    ])
    const banks = await adapter.bankList!.listBanks(CTX, { countryCode: "ke" })

    const call = http.calls.find(isBankList)!
    expect(call.url).toContain("/banks?country=KE") // uppercased
    expect(banks).toEqual([{ code: "044", name: "Access Bank" }, { code: "011", name: "First Bank" }])
    // The provider-internal `id` never leaks into the normalized shape.
    expect(Object.keys(banks[0])).toEqual(["code", "name"])
  })

  it("caches the result in-memory per environment+country — a second call for the same country makes no second HTTP request", async () => {
    const { http, adapter } = build([
      tokenOk,
      { match: isBankList, respond: { status: 200, body: { data: [{ id: "b", code: "044", name: "Access Bank" }] } } },
    ])
    await adapter.bankList!.listBanks(CTX, { countryCode: "KE" })
    const callsAfterFirst = http.calls.filter(isBankList).length
    await adapter.bankList!.listBanks(CTX, { countryCode: "KE" })
    expect(http.calls.filter(isBankList).length).toBe(callsAfterFirst)
  })

  it("does not reuse the cache across different countries", async () => {
    const { http, adapter } = build([
      tokenOk,
      { match: (r) => isBankList(r) && r.url.includes("country=KE"), respond: { status: 200, body: { data: [{ id: "b1", code: "044", name: "Access Bank" }] } } },
      { match: (r) => isBankList(r) && r.url.includes("country=NG"), respond: { status: 200, body: { data: [{ id: "b2", code: "011", name: "First Bank" }] } } },
    ])
    const ke = await adapter.bankList!.listBanks(CTX, { countryCode: "KE" })
    const ng = await adapter.bankList!.listBanks(CTX, { countryCode: "NG" })
    expect(ke[0].name).toBe("Access Bank")
    expect(ng[0].name).toBe("First Bank")
  })

  it("skips a malformed entry (missing code/name) instead of throwing", async () => {
    const { adapter } = build([
      tokenOk,
      { match: isBankList, respond: { status: 200, body: { data: [{ id: "b1" }, { id: "b2", code: "044", name: "Access Bank" }] } } },
    ])
    const banks = await adapter.bankList!.listBanks(CTX, { countryCode: "GH" })
    expect(banks).toEqual([{ code: "044", name: "Access Bank" }])
  })

  it("normalizes an unsupported-country failure to a ProviderError", async () => {
    const { adapter } = build([
      tokenOk,
      { match: isBankList, respond: { status: 400, body: fwError("VALIDATION_ERROR", "Unsupported country") } },
    ])
    await expect(adapter.bankList!.listBanks(CTX, { countryCode: "ZZ" })).rejects.toMatchObject({ name: "ProviderError", category: "INVALID_REQUEST" })
  })
})

describe("Flutterwave adapter — capability set", () => {
  it("declares collection / refund / bank-payout / bank-resolution / bank-list / webhooks, not mobile-money payout", () => {
    const { adapter } = build([])
    expect(adapter.capabilities.has("COLLECTION_MOBILE_MONEY")).toBe(true)
    expect(adapter.capabilities.has("PAYOUT_BANK")).toBe(true)
    expect(adapter.capabilities.has("BANK_ACCOUNT_RESOLUTION")).toBe(true)
    expect(adapter.capabilities.has("BANK_LIST")).toBe(true)
    expect(adapter.capabilities.has("WEBHOOKS")).toBe(true)
    expect(adapter.capabilities.has("PAYOUT_MOBILE_MONEY")).toBe(false)
  })

  it("actually implements bankResolution and bankList on the adapter surface, not just the capability set", () => {
    const { adapter } = build([])
    expect(adapter.bankResolution).toBeDefined()
    expect(adapter.bankList).toBeDefined()
  })

  it("declares the secret keys its credential reader requires (clientId + clientSecret)", () => {
    const { adapter } = build([])
    expect(adapter.requiredSecretKeys).toEqual(["clientId", "clientSecret"])
  })
})

describe("Flutterwave adapter — TEST vs LIVE base URL (v4 hosts)", () => {
  it("hits the sandbox host for TEST and the production host for LIVE", async () => {
    for (const [environment, host] of [
      ["TEST", "developersandbox-api.flutterwave.com"],
      ["LIVE", "f4bexperience.flutterwave.com"],
    ] as const) {
      const { http, adapter } = build([
        tokenOk,
        { match: (r) => r.url.includes(CHARGE_PATH), respond: { status: 201, body: { data: { id: "c", status: "pending" } } } },
      ])
      await adapter.collection!.createCharge({ ...CTX, environment }, chargeInput())
      expect(http.calls.find((c) => c.url.includes(CHARGE_PATH))!.url).toContain(host)
    }
  })

  it("honours a per-account baseUrl override from the secret bundle", async () => {
    const { http, adapter } = build([
      tokenOk,
      { match: (r) => r.url.includes(CHARGE_PATH), respond: { status: 201, body: { data: { id: "c", status: "pending" } } } },
    ])
    await adapter.collection!.createCharge(
      { ...CTX, secrets: { ...CTX.secrets, baseurl: "https://custom.flutterwave.test/api" } },
      chargeInput(),
    )
    expect(http.calls.find((c) => c.url.includes(CHARGE_PATH))!.url).toContain("custom.flutterwave.test")
  })
})
