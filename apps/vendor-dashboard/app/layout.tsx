import type { Metadata } from "next"
import localFont from "next/font/local"
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from "@repo/ui/components/sonner"
import { ThemeProviders } from "@repo/ui/components/theme-provider"
import "./globals.css"


import { Fraunces, Inter } from 'next/font/google'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fraunces',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Bread & Bowl | Vendor Dashboard",
  description: "Bread & Bowl Vendor Dashboard | Manage Your Meal Plans with Ease.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${fraunces.variable}`} suppressHydrationWarning>
        <body className="min-h-screen bg-background font-sans antialiased">
          <ThemeProviders>
            {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
              duration={4000}
              theme="light"
              className="font-sans"
              toastOptions={{
                classNames: {
                  toast: "vendor-card",
                  title: "font-semibold",
                  description: "text-muted-foreground",
                  success: "border-emerald-500/20",
                  error: "border-error/20",
                  warning: "border-amber-500/20",
                  info: "border-info/20",
                },
              }}
            />
          </ThemeProviders>
        </body>
      </html>
    </ClerkProvider>
  )
}