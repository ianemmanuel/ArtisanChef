import Link from 'next/link'

export default function OnboardingFooter() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="h-16 flex items-center justify-between px-6 border-t border-border bg-card/50">
      <p className="text-sm text-muted-foreground">
        © {currentYear} Daily Bread. All rights reserved.
      </p>
      
      <div className="flex items-center gap-6 text-sm">
        <Link 
          href="/privacy" 
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Privacy
        </Link>
        <Link 
          href="/terms" 
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Terms
        </Link>
        <Link 
          href="/support" 
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Support
        </Link>
      </div>
    </footer>
  )
}