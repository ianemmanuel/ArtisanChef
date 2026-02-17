import AuthAside from "@/components/auth/AuthAside"
import AuthNavbar from "@/components/auth/AuthNavbar"
import AuthFooter from "@/components/auth/AuthFooter"
import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
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
                Sign in to manage your dashboard
              </p>
            </div>

            {/* Clerk form - clean wrapper */}
            <div className="w-full">
              {children}
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                Need help?{' '}
                <Link 
                  href="mailto:support@breadbowl.com" 
                  className="text-foreground hover:text-peach-600 dark:hover:text-peach-400 transition-colors font-medium"
                >
                  Contact support
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      <AuthFooter />
    </div>
  )
}