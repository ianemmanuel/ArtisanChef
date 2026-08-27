"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { clientFetch } from "@/lib/api/client"
import type { AvailablePayoutMethod, VendorPayoutAccount, AddPayoutAccountRequest } from "@repo/types/vendor-app"

/*
 * Roadmap Phase 4 (CLAUDE.md) — the vendor.payout.routes.ts backend was
 * already fully built (add/list/get/set-default/remove); this is the
 * frontend wiring it was missing. Same lib/queries hook shape as
 * account-documents.ts.
 */

export const payoutKeys = {
  methods : ["payout", "methods"] as const,
  accounts: ["payout", "accounts"] as const,
}

export function usePayoutMethods() {
  return useQuery({
    queryKey: payoutKeys.methods,
    queryFn : () => clientFetch<AvailablePayoutMethod[]>("/api/payout/methods"),
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
