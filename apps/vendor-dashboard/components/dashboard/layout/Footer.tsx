import Link from 'next/link';

export function DashboardFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card mt-16 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-480 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Brand with gradient accent */}
          <div className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-terracotta-500 to-terracotta-600 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
              {/* logo */}
              <span className="font-['Fraunces'] text-base font-bold dark:text-white">A</span>
            </div>
            <Link 
              href="/dashboard" 
              className="font-['Fraunces'] text-xl font-semibold text-foreground hover:text-primary transition-colors"
            >
              Daily Bread
            </Link>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            © {currentYear} Daily Bread. Crafted meals with care.
          </p>

          <div className="flex gap-6 text-sm">
            <Link 
              href="/privacy" 
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Privacy
            </Link>
            <Link 
              href="/terms" 
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Terms
            </Link>
            <Link 
              href="/support" 
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Support
            </Link>
          </div>
        </div>
        
        {/* Subtle gradient divider and version info */}
        <div className="mt-6 pt-6 border-t border-border/50">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
            <p>Vendor Dashboard </p>
            <p>Designed for clarity and efficiency</p>
          </div>
        </div>
      </div>
      
      {/* Bottom accent gradient */}
      <div className="h-1 w-full bg-linear-to-br from-terracotta-500 via-honey-500 to-sage-500 opacity-30" />
    </footer>
  );
}