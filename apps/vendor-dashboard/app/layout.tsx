import type { Metadata } from "next"
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

import { Inter, IBM_Plex_Mono, Playfair_Display } from 'next/font/google'
import { ThemeProvider } from "@/components/themes/theme-provider"
import { Providers } from "./providers"

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-mono',
  weight: ['400', '500', '700'],
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: "DailyBread | Vendor Dashboard",
  description: "DailyBread Vendor Dashboard | Manage Your Meals and Meal Plans.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: 'var(--primary)',
          colorBackground: 'var(--card)',
          colorText: 'var(--foreground)',
          colorTextSecondary: 'var(--muted-foreground)',
          colorInputBackground: 'var(--input)',
          colorInputText: 'var(--foreground)',
          colorDanger: 'var(--destructive)',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-inter)',
        },
        elements: {
          // Clerk's own OS-level color-scheme detection can otherwise leave
          // these looking transparent — pin them explicitly since the app
          // itself is light-only.
          socialButtonsBlockButton: 'bg-card border border-border shadow-xs',
          dividerLine: 'bg-border',
        },
      }}
    >
      <html
        lang="en"
        className={`${inter.variable} ${ibmPlexMono.variable} ${playfair.variable}`}
        suppressHydrationWarning
      >
        <body className="font-sans antialiased">
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            forcedTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <Providers>
              {children}
              <Toaster
                position="top-right"
                richColors
                closeButton
                duration={4000}
              />
            </Providers>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}