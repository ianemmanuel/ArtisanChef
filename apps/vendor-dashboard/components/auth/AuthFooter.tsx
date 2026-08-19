import Link from 'next/link'
import { Mail } from 'lucide-react'

export default function AuthFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border/60 bg-card/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-6 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
        <p className="text-xs text-muted-foreground">
          &copy; {currentYear} DailyBread
        </p>

        <Link
          href="mailto:support@dailybread.com"
          className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Mail className="h-3.5 w-3.5" />
          Support
        </Link>
      </div>
    </footer>
  )
}
