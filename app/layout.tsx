import { Inter, Montserrat } from "next/font/google"
import "./globals.css"
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/nextjs"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })
const headingFont = Montserrat({ 
  subsets: ["latin"],
  variable: '--font-heading'
})

export const metadata = {
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
        <body className={cn(
          inter.className, 
          headingFont.variable,
          "min-h-screen bg-background"
        )}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
} 