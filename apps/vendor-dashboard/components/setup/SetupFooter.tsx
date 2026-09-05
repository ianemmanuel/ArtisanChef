import Link from "next/link"

/*
 * Minimal setup-area footer — an authenticated business tool, not a
 * marketing site. Brand mark, copyright, one support link.
 */
export function SetupFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border/60 bg-card/60">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-6 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 sm:text-left">
        <p>&copy; {year} DailyBread — Vendor setup</p>
        <Link href="mailto:support@dailybread.com" className="transition-colors hover:text-foreground">
          Need help? Contact support
        </Link>
      </div>
    </footer>
  )
}
