"use client"

import { useEffect, useState } from "react"
import { SidebarContext } from "@/contexts/sidebar-context"

const STORAGE_KEY      = "db-admin-sidebar-collapsed"
const WIDTH_EXPANDED   = "240px"
const WIDTH_COLLAPSED  = "72px"

function applyOffset(collapsed: boolean) {
  const isDesktop = window.matchMedia("(min-width: 1024px)").matches
  document.documentElement.style.setProperty(
    "--_sidebar-offset",
    isDesktop ? (collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED) : "0px"
  )
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Always starts `false` — matching what the server renders, since it has
  // no access to localStorage. Reading localStorage in the initializer
  // (as this used to) makes the client's *first* render disagree with the
  // server's, which is a hydration mismatch, not just a suppressible
  // warning — React discards and re-renders the whole subtree when it
  // happens. The real value is applied a moment later, after mount.
  const [collapsed, setCollapsedState] = useState(false)

  // Read the persisted preference once, after mount (client-only).
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "true") setCollapsedState(true)
    } catch { /* ignore */ }
  }, [])

  // Write CSS var whenever collapsed changes
  useEffect(() => {
    applyOffset(collapsed)
  }, [collapsed])

  // Re-evaluate on viewport resize (mobile ↔ desktop)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const handler = () => applyOffset(collapsed)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [collapsed])

  const setCollapsed = (v: boolean) => {
    setCollapsedState(v)
    try { localStorage.setItem(STORAGE_KEY, String(v)) } catch { /* ignore */ }
  }

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        toggle: () => setCollapsed(!collapsed),
        setCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}