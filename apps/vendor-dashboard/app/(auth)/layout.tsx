import AuthAside from "@/components/auth/AuthAside"
import AuthNavbar from "@/components/auth/AuthNavbar"
import AuthFooter from "@/components/auth/AuthFooter"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <AuthNavbar />

      {/* Main content */}
      <main className="flex flex-1">
        {/* Left aside panel (desktop only) */}
        <div className="hidden lg:flex lg:w-[42%] border-r border-border">
          <AuthAside />
        </div>

        {/* Auth form area */}
        <div className="flex w-full lg:w-[58%] items-center justify-center p-6 md:p-8 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile welcome message */}
            <div className="lg:hidden mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-3">
                Welcome back
              </h1>
              <p className="text-base text-muted-foreground">
                Sign in to manage your bakery dashboard
              </p>
            </div>

            {/* Clerk form - clean wrapper */}
            <div className="w-full">
              {children}
            </div>

            {/* Help text - minimal */}
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                Need help?{' '}
                <a 
                  href="mailto:support@breadbowl.com" 
                  className="text-foreground hover:text-peach-600 dark:hover:text-peach-400 transition-colors font-medium"
                >
                  Contact support
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <AuthFooter />
    </div>
  )
}