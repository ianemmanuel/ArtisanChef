"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { clientFetch } from "@/lib/api/client"
import type { AvailablePayoutMethod, VendorPayoutAccount, AddPayoutAccountRequest, VendorSupportedBanks } from "@repo/types/vendor-app"

/*
 * Roadmap Phase 4 (CLAUDE.md) — the vendor.payout.routes.ts backend was
 * already fully built (add/list/get/set-default/remove); this is the
 * frontend wiring it was missing. Same lib/queries hook shape as
 * account-documents.ts.
 */

export const payoutKeys = {
  methods : ["payout", "methods"] as const,
  banks   : ["payout", "banks"] as const,
  accounts: ["payout", "accounts"] as const,
}

export function usePayoutMethods() {
  return useQuery({
    queryKey: payoutKeys.methods,
    queryFn : () => clientFetch<AvailablePayoutMethod[]>("/api/payout/methods"),
  })
}

/*
 * Vendor 1E — the vendor's country/active-provider bank list. `enabled`
 * lets the caller defer the request until the BANK method is actually
 * selected, since most vendors never need it. `supported: false` (no
 * banks configured for this country/provider yet) is a normal response,
 * not an error — react-query only ever surfaces a transport/provider
 * failure as `isError`.
 */
export function usePayoutBanks(enabled: boolean) {
  return useQuery({
    queryKey: payoutKeys.banks,
    queryFn : () => clientFetch<VendorSupportedBanks>("/api/payout/banks"),
    enabled,
    staleTime: 60 * 60 * 1000, // banks change essentially never — an hour is plenty
  })
}

export function usePayoutAccounts() {
  return useQuery({
    queryKey: payoutKeys.accounts,
    queryFn : () => clientFetch<VendorPayoutAccount[]>("/api/payout/accounts"),
  })
}

export function useAddPayoutAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddPayoutAccountRequest) =>
      clientFetch<VendorPayoutAccount>("/api/payout/accounts", {
        method: "POST",
        body  : JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payoutKeys.accounts })
    },
  })
}

export function useSetDefaultPayoutAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      clientFetch<{ success: boolean }>(`/api/payout/accounts/${id}/set-default`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payoutKeys.accounts })
    },
  })
}

export function useRemovePayoutAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      clientFetch<{ success: boolean }>(`/api/payout/accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payoutKeys.accounts })
    },
  })
}
