import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import AuthNavbar from "@/components/auth/AuthNavbar"
import AuthFooter from "@/components/auth/AuthFooter"

/*
 * A signed-in visitor who lands on /sign-in or /sign-up gets bounced to
 * "/" here, server-side, before <SignIn>/<SignUp> ever mounts — "/" is
 * the one place that knows where an authenticated vendor actually
 * belongs (see app/page.tsx). Without this, Clerk's own client-side
 * "already signed in" guard does the same redirect a beat later, after
 * rendering the form for a frame and logging a dev-only console notice.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (userId) redirect("/")

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AuthNavbar />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      <AuthFooter />
    </div>
  )
}
