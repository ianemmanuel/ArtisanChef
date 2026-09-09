import { describe, it, expect } from "vitest"
import { createHmac } from "node:crypto"
import { createDlocalAdapter } from "./dlocal.adapter"
import type { DlocalHttpClient, DlocalHttpRequest, DlocalHttpResponse } from "./dlocal.http"
import type { ProviderCallContext, ResolveBankAccountInput } from "../provider.types"

/*
 * Every test injects a fake HTTP client — NO test touches the network or the
 * real dLocal API. The request/response shapes here follow
 * docs.dlocal.com/reference/account-validation ; live sandbox verification
 * is blocked on dLocal credentials (none exist yet).
 */

interface Stub {
  match: (req: DlocalHttpRequest) => boolean
  respond: DlocalHttpResponse | ((req: DlocalHttpRequest) => DlocalHttpResponse)
}

class FakeHttp implements DlocalHttpClient {
  readonly calls: DlocalHttpRequest[] = []
  constructor(private stubs: Stub[]) {}
  async request(req: DlocalHttpRequest): Promise<DlocalHttpResponse> {
    this.calls.push(req)
    const stub = this.stubs.find((s) => s.match(req))
    if (!stub) throw new Error(`no stub for ${req.method} ${req.url}`)
    return typeof stub.respond === "function" ? stub.respond(req) : stub.respond
  }
}

const isValidation = (r: DlocalHttpRequest) => r.url.includes("/payouts/validation/external-account")

const CTX: ProviderCallContext = {
  environment: "TEST",
  secrets: { xlogin: "merchant-login", xtranskey: "trans-key", secretkey: "secret-should-never-leak" },
  traceId: "trace-abcd1234",
}

const NG: ResolveBankAccountInput = {
  bankCode: "058",
  accountNumber: "0036123456",
  currency: "NGN",
  countryCode: "NG",
}

function build(stubs: Stub[]) {
  const http = new FakeHttp(stubs)
  return { http, adapter: createDlocalAdapter({ http }) }
}

const ok = (body: unknown): Stub => ({ match: isValidation, respond: { status: 200, body } })

describe("dLocal adapter — capability set", () => {
  it("declares BANK_ACCOUNT_RESOLUTION and nothing else", () => {
    const { adapter } = build([])
    expect([...adapter.capabilities]).toEqual(["BANK_ACCOUNT_RESOLUTION"])
    expect(adapter.bankResolution).toBeDefined()
    expect(adapter.collection).toBeUndefined()
    expect(adapter.payouts).toBeUndefined()
    expect(adapter.bankList).toBeUndefined()
    expect(adapter.webhooks).toBeUndefined()
    expect(adapter.code).toBe("DLOCAL")
  })

  it("declares the secret keys its credential reader requires", () => {
    const { adapter } = build([])
    expect(adapter.requiredSecretKeys).toEqual(["xLogin", "xTransKey", "secretKey"])
  })
})

describe("dLocal adapter — request construction + signing", () => {
  it("POSTs the Nigeria body and signs X-Login + X-Date + body with the secret key", async () => {
    const { http, adapter } = build([ok({ id: "PAV-1", status: "1000", full_name: "ANDREW GATES" })])
    await adapter.bankResolution!.resolveBankAccount(CTX, NG)

    const call = http.calls.find(isValidation)!
    expect(call.method).toBe("POST")
    expect(JSON.parse(call.body!)).toEqual({ country: "NG", account_type: "BANK", bank_code: "058", account: "0036123456" })

    expect(call.headers["X-Login"]).toBe("merchant-login")
    expect(call.headers["X-Trans-Key"]).toBe("trans-key")
    expect(call.headers["X-Version"]).toBe("2.1")
    expect(call.headers["Content-Type"]).toBe("application/json")

    const xDate = call.headers["X-Date"]
    const expectedSig = createHmac("sha256", "secret-should-never-leak")
      .update(`merchant-login${xDate}${call.body}`, "utf8")
      .digest("hex")
    expect(call.headers.Authorization).toBe(`V2-HMAC-SHA256, Signature: ${expectedSig}`)
  })

  it("never puts the secret key anywhere in the request", async () => {
    const { http, adapter } = build([ok({ status: "1000", full_name: "X" })])
    await adapter.bankResolution!.resolveBankAccount(CTX, NG)
    const call = http.calls.find(isValidation)!
    expect(JSON.stringify(call)).not.toContain("secret-should-never-leak")
  })

  it("hits the sandbox host for TEST and the production host for LIVE", async () => {
    for (const [environment, host] of [
      ["TEST", "sandbox.dlocal.com"],
      ["LIVE", "api.dlocal.com"],
    ] as const) {
      const { http, adapter } = build([ok({ status: "1000", full_name: "X" })])
      await adapter.bankResolution!.resolveBankAccount({ ...CTX, environment }, NG)
      expect(http.calls.find(isValidation)!.url).toContain(host)
    }
  })

  it("honours a per-account baseUrl override from the secret bundle", async () => {
    const { http, adapter } = build([ok({ status: "1000", full_name: "X" })])
    await adapter.bankResolution!.resolveBankAccount(
      { ...CTX, secrets: { ...CTX.secrets, baseurl: "https://custom.dlocal.test" } },
      NG,
    )
    expect(http.calls.find(isValidation)!.url).toBe("https://custom.dlocal.test/payouts/validation/external-account")
  })

  it("fails fast with AUTHENTICATION and no network call when a credential is missing", async () => {
    const { http, adapter } = build([])
    await expect(
      adapter.bankResolution!.resolveBankAccount({ ...CTX, secrets: { xlogin: "a" } }, NG),
    ).rejects.toMatchObject({ name: "ProviderError", category: "AUTHENTICATION" })
    expect(http.calls).toHaveLength(0)
  })
})

describe("dLocal adapter — outcome mapping", () => {
  it("returns a normalized bank account on a 1000 success", async () => {
    const { adapter } = build([ok({ id: "PAV-9", status: "1000", message: "Successful validation", full_name: "ANDREW GATES" })])
    const out = await adapter.bankResolution!.resolveBankAccount(CTX, NG)
    expect(out).toEqual({ accountNumber: "0036123456", accountName: "ANDREW GATES", bankCode: "058" })
  })

  it("maps a declined validation (1011) to TRANSACTION_DECLINED", async () => {
    const { adapter } = build([{ match: isValidation, respond: { status: 400, body: { code: "1011", message: "Account details did not pass validation" } } }])
    await expect(adapter.bankResolution!.resolveBankAccount(CTX, NG)).rejects.toMatchObject({ category: "TRANSACTION_DECLINED" })
  })

  it("maps an auth rejection (401) to AUTHENTICATION", async () => {
    const { adapter } = build([{ match: isValidation, respond: { status: 401, body: { message: "unauthorized" } } }])
    await expect(adapter.bankResolution!.resolveBankAccount(CTX, NG)).rejects.toMatchObject({ category: "AUTHENTICATION" })
  })

  it("maps a 5xx to PROVIDER_UNAVAILABLE", async () => {
    const { adapter } = build([{ match: isValidation, respond: { status: 503, body: {} } }])
    await expect(adapter.bankResolution!.resolveBankAccount(CTX, NG)).rejects.toMatchObject({ category: "PROVIDER_UNAVAILABLE" })
  })

  it("fails fast (no network, no credential read) with UNSUPPORTED_CAPABILITY for an unsupported country", async () => {
    const { http, adapter } = build([])
    await expect(
      adapter.bankResolution!.resolveBankAccount(CTX, { ...NG, countryCode: "KE" }),
    ).rejects.toMatchObject({ name: "ProviderError", category: "UNSUPPORTED_CAPABILITY" })
    expect(http.calls).toHaveLength(0)
  })

  it("never leaks the account number into a thrown provider error", async () => {
    const { adapter } = build([{ match: isValidation, respond: { status: 400, body: { code: "1011", message: "bad" } } }])
    try {
      await adapter.bankResolution!.resolveBankAccount(CTX, NG)
      throw new Error("expected rejection")
    } catch (err) {
      expect(String((err as Error).message)).not.toContain("0036123456")
    }
  })
})
