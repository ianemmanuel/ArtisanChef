"use client"

import { useQuery } from "@tanstack/react-query"
import { clientFetch } from "@/lib/api/client"
import type { OutletInspectionRow } from "@repo/types/vendor-app"

/* Read-only — a vendor sees where an outlet's premises inspection stands but
 * never schedules or acts on it (the admin ops team owns that). */
export function useOutletInspections(outletId: string) {
  return useQuery({
    queryKey: ["outletInspections", outletId] as const,
    queryFn : () => clientFetch<OutletInspectionRow[]>(`/api/outlets/${outletId}/inspections`),
  })
}
