"use client"

import { createContext, useContext } from "react"

/*
 * Carries the vendor's selling-ready flag (from the authoritative
 * getVendorGoLiveStatus, resolved once server-side in (dashboard)/layout.tsx)
 * to the client sidebar, so nav reflects the setup / operational split
 * without every nav component fetching the session itself.
 */
const VendorNavContext = createContext<{ sellingReady: boolean }>({ sellingReady: false })

export function VendorNavProvider({
  sellingReady,
  children,
}: {
  sellingReady: boolean
  children: React.ReactNode
}) {
  return <VendorNavContext.Provider value={{ sellingReady }}>{children}</VendorNavContext.Provider>
}

export function useVendorNav() {
  return useContext(VendorNavContext)
}
