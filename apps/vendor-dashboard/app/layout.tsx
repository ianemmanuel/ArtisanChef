import type { Metadata } from "next"
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from "@repo/ui/components/sonner"
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
  title: "Artisan Chef | Vendor Dashboard",
  description: "Artisan Chef Vendor Dashboard | Manage Your Meal Plans with Ease.",
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
            {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
              duration={4000}
            />
        </body>
      </html>
    </ClerkProvider>
  )
}