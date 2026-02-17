import Link from 'next/link'
import { Shield, Mail } from 'lucide-react'

export default function AuthFooter() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="border-t border-border/40 bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 flex-col items-center justify-between gap-4 px-6 py-4 sm:flex-row sm:gap-0">
        {/* Left */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-espresso-500" />
            <span className="text-xs text-muted-foreground">
              Secure • Encrypted • Trusted
            </span>
          </div>
        </div>

        {/* Center */}
        <p className="text-sm text-muted-foreground text-center">
          © {currentYear} Daily Bread Vendor Dashboard
        </p>

        {/* Right */}
        <div className="flex items-center gap-6">
          <Link 
            href="/privacy" 
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link 
            href="/terms" 
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms
          </Link>
          <Link 
            href="mailto:support@artisanbakery.com"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail className="h-3 w-3" />
            <span className="hidden sm:inline">Support</span>
          </Link>
        </div>
      </div>
    </footer>
  )
}