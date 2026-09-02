import { describe, it, expect } from "vitest"
import { readFlutterwaveCredentials, readFlutterwaveWebhookSecret } from "./flutterwave.credentials"
import { ProviderError } from "../provider.errors"

/*
 * The env-backed ProviderSecretsResolver lowercases every key, so the bundle
 * arrives like { clientid, clientsecret, ... }. The reader must be
 * case-insensitive and must fail clearly on a missing required key.
 */

describe("readFlutterwaveCredentials", () => {
  it("reads a full lowercased bundle (as the env resolver produces)", () => {
    const creds = readFlutterwaveCredentials({
      clientid: "cid_123",
      clientsecret: "csec_456",
      encryptionkey: "enc_789",
      webhooksecrethash: "whs_abc",
    })
    expect(creds.clientId).toBe("cid_123")
    expect(creds.clientSecret).toBe("csec_456")
    expect(creds.encryptionKey).toBe("enc_789")
    expect(creds.webhookSecretHash).toBe("whs_abc")
  })

  it("is case-insensitive about the key names", () => {
    const creds = readFlutterwaveCredentials({ ClientId: "a", CLIENTSECRET: "b" })
    expect(creds.clientId).toBe("a")
    expect(creds.clientSecret).toBe("b")
  })

  it("treats encryptionKey / webhookSecretHash as optional", () => {
    const creds = readFlutterwaveCredentials({ clientid: "a", clientsecret: "b" })
    expect(creds.encryptionKey).toBeUndefined()
    expect(creds.webhookSecretHash).toBeUndefined()
  })

  it("throws an AUTHENTICATION ProviderError when clientId is missing", () => {
    try {
      readFlutterwaveCredentials({ clientsecret: "b" })
      expect.unreachable("should have thrown")
    } catch (e) {
      expect(e).toBeInstanceOf(ProviderError)
      expect((e as ProviderError).category).toBe("AUTHENTICATION")
    }
  })

  it("throws when clientSecret is blank", () => {
    expect(() => readFlutterwaveCredentials({ clientid: "a", clientsecret: "   " })).toThrow(ProviderError)
  })

  it("picks up per-account baseUrl / idpUrl overrides", () => {
    const creds = readFlutterwaveCredentials({
      clientid: "a",
      clientsecret: "b",
      baseurl: "https://example.test/api",
      idpurl: "https://example.test/token",
    })
    expect(creds.baseUrl).toBe("https://example.test/api")
    expect(creds.idpUrl).toBe("https://example.test/token")
  })
})

describe("readFlutterwaveWebhookSecret", () => {
  it("returns the hash when present", () => {
    expect(readFlutterwaveWebhookSecret({ webhooksecrethash: "whs_xyz" })).toBe("whs_xyz")
  })
  it("throws when absent", () => {
    expect(() => readFlutterwaveWebhookSecret({ clientid: "a" })).toThrow(ProviderError)
  })
})
