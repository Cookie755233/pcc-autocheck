import { Inter, Montserrat } from "next/font/google"
import "./globals.css"
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/nextjs"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { NotificationProvider } from "@/contexts/notification-context"
import { ThemeEffect } from '@/components/ui/theme-effect'
import { Metadata } from 'next'
import { SubscriptionProvider } from '@/lib/contexts/subscription-context'
import { NavigationProgress } from "@/components/navigation-progress"

const inter = Inter({ subsets: ["latin"] })
const headingFont = Montserrat({ 
  subsets: ["latin"],
  variable: '--font-heading'
})

export const metadata: Metadata = {
  title: "Tender Watch - Government Tender Subscription",
  description: "Subscribe and track government tenders automatically",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head />
        <body className={cn(
          inter.className, 
          headingFont.variable,
          "min-h-screen bg-background relative"
        )}>
          {/* Add navigation progress indicator */}
          <NavigationProgress />
          
          {/* Colored blurred dots background (behind the dot pattern) */}
          <div className="bg-colored-dots" />
          
          {/* Regular dot pattern */}
          <div className="fixed inset-0 -z-10 bg-dot-pattern opacity-30 pointer-events-none" />
          
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem={false}
          >
            <SubscriptionProvider>
              <NotificationProvider>
                <Toaster />
                <div className="page-transition-wrapper">
                  {children}
                </div>
                <ThemeEffect />
              </NotificationProvider>
            </SubscriptionProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
} 