export function DashboardFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card mt-16 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-[1920px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Brand with gradient accent */}
          <div className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-terracotta-500 to-terracotta-600 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
              <span className="font-['Fraunces'] text-base font-bold text-white">B</span>
            </div>
            <span className="font-['Fraunces'] text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
              Bread & Bowl
            </span>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground text-center">
            © {currentYear} Bread & Bowl. Crafted with care.
          </p>

          {/* Links */}
          <div className="flex gap-6 text-sm">
            <a 
              href="#" 
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Privacy
            </a>
            <a 
              href="#" 
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Terms
            </a>
            <a 
              href="#" 
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Support
            </a>
          </div>
        </div>
        
        {/* Subtle gradient divider and version info */}
        <div className="mt-6 pt-6 border-t border-border/50">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
            <p>Vendor Dashboard v1.0</p>
            <p>Designed for clarity and efficiency</p>
          </div>
        </div>
      </div>
      
      {/* Bottom accent gradient */}
      <div 
        className="h-1 w-full"
        style={{
          background: 'linear-gradient(90deg, var(--color-terracotta-500) 0%, var(--color-honey-500) 50%, var(--color-sage-500) 100%)',
          opacity: 0.3
        }}
      />
    </footer>
  );
}