import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

/*
 * Backend unit tests. Phase 1A scope: the pure financial invariants
 * introduced by the Finance module (Money arithmetic, currency-code
 * convention, provider-capability coherence, finance scope guard).
 *
 * No DB / HTTP integration harness yet — see the Phase 1A summary. When
 * one is added, give it a separate project/config so these stay fast.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
})
