import { Button } from "@/components/ui/button"
import { SignInButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { ArrowRight, Search, Bell, Archive, FileText, Filter, RefreshCw } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { useEffect } from "react"
import { NavLinks } from "@/components/landing/nav-links"
import { LearnMoreButton } from "@/components/landing/learn-more-button"
import { UserButton } from "@clerk/nextjs"

export default async function LandingPage() {
  const { userId } = await auth()
  
  // Only redirect to dashboard if coming from "Get Started" button
  // Remove the automatic redirect here

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation - Fixed at top */}
      <nav className="sticky top-0 w-full z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link 
              href="/"
              className="font-semibold hover:text-foreground/80 transition-colors"
            >
              TenderWatch
            </Link>
            <NavLinks />
          </div>
          <div className="flex items-center gap-4">
            {userId ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
                <UserButton afterSignOutUrl="/" />
              </>
            ) : (
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </SignInButton>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        id="hero" 
        className="min-h-screen pt-14 flex items-center justify-center scroll-mt-14"
      >
        <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
          <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl pt-4">
            Your Smart<br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
              Tender Assistant
            </span>
          </h1>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8 font-light py-10">
            Automatically track government tenders with smart keyword matching, real-time notifications, 
            and powerful organization tools. Export to PDF, filter with ease, and never miss an opportunity.
          </p>
          <div className="space-x-4">
            {userId ? (
              <Button 
                size="lg" 
                className="gap-2 group relative overflow-hidden" 
                asChild
              >
                <Link href="/dashboard" className="flex items-center">
                  <span className="relative z-10 flex items-center gap-2">
                    Get Started 
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </Button>
            ) : (
              <SignInButton mode="modal">
                <Button 
                  size="lg" 
                  className="gap-2 group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Get Started 
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </SignInButton>
            )}
            <LearnMoreButton />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section 
        id="features" 
        className={`min-h-screen flex items-center justify-center scroll-mt-14
          bg-gradient-to-r from-purple-300/10 via-pink-400/10 to-red-200/10
          backdrop-blur-sm backdrop-opacity-50 
          rounded-3xl w-full
        `}
      >
        <div className="container py-8 md:py-12 lg:py-24 space-y-12">
          <div className="relative">
            <div className="relative mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center ">
              <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
                <span className={`
                  bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text 
                  text-transparent font-semibold underline mr-4
                  `}
                >
                  Powerful
                </span>
                Features
              </h2>
              <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
                Everything you need to efficiently manage and track government tenders
              </p>
            </div>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Search className="h-12 w-12" />
                <div className="space-y-2">
                  <h3 className="font-bold">Smart Keyword Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    Subscribe to multiple keywords and get instant matches. Easily manage your keyword list with bulk actions.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Bell className="h-12 w-12" />
                <div className="space-y-2">
                  <h3 className="font-bold">Real-time Alerts</h3>
                  <p className="text-sm text-muted-foreground">
                    Get instant notifications for new matches. Visual indicators highlight fresh opportunities.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Archive className="h-12 w-12" />
                <div className="space-y-2">
                  <h3 className="font-bold">Smart Organization</h3>
                  <p className="text-sm text-muted-foreground">
                    Kanban-style board with inbox and archive sections. Filter and sort tenders effortlessly.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <FileText className="h-12 w-12" />
                <div className="space-y-2">
                  <h3 className="font-bold">PDF Export</h3>
                  <p className="text-sm text-muted-foreground">
                    Export tenders to beautifully formatted PDFs. Share or archive important opportunities.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Filter className="h-12 w-12" />
                <div className="space-y-2">
                  <h3 className="font-bold">Advanced Filters</h3>
                  <p className="text-sm text-muted-foreground">
                    Filter by date, amount, and status. Find exactly what you're looking for quickly.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <RefreshCw className="h-12 w-12" />
                <div className="space-y-2">
                  <h3 className="font-bold">Auto Updates</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatic refresh keeps your dashboard current. Manual refresh available when you need it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Combined Acknowledgements & Caveats Section */}
      <section 
        id="acknowledgements" 
        className="min-h-screen flex items-center justify-center scroll-mt-14"
      >
        <div className="container py-8 md:py-12">
          <div className="mx-auto max-w-[58rem] space-y-12">
            {/* Acknowledgements */}
            <div className="space-y-6">
              <h2 className="font-heading text-4xl text-center">
                  Acknowledgements
              </h2>
              <div className="rounded-lg border p-6 bg-background/60 backdrop-blur">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold mb-2">g0v Community &
                        <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent font-bold pl-[0.4rem]">Ronny Wang</span>
                      </h3>
                      <p className="text-muted-foreground">
                        Built upon the incredible work of Taiwan's g0v community and Ronny Wang's 
                        <a 
                          href="https://github.com/ronnywang/pcc.g0v.ronny.tw" 
                          className="text-blue-500 underline hover:text-blue-600 mx-1"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          open-source API
                        </a>
                        that democratizes access to government procurement data. Their commitment to 
                        transparency and open data makes TenderWatch possible.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="space-y-6">
              <h2 className="font-heading text-4xl text-center">
                  Caveats
              </h2>
              <div className="rounded-lg border p-6 bg-background/60 backdrop-blur">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <span className="text-primary">⏰</span> Data Freshness
                    </h3>
                    <p className="text-muted-foreground">
                      While we strive for real-time updates, tender data syncs daily. 
                      For time-sensitive decisions, cross-reference with the official procurement website.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <span className="text-primary">🎯</span> Matching Precision
                    </h3>
                    <p className="text-muted-foreground">
                      Our keyword matching focuses on tender titles for speed. 
                      Always review the complete tender details for the full picture.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <span className="text-primary">📋</span> Due Diligence
                    </h3>
                    <p className="text-muted-foreground">
                      TenderWatch is a powerful tool, but shouldn't be your only source. 
                      Use it alongside official channels for critical business decisions.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <span className="text-primary">🔄</span> Continuous Improvement
                    </h3>
                    <p className="text-muted-foreground">
                      We're constantly evolving. Your feedback helps us enhance the accuracy 
                      and reliability of our tender matching system.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="container py-8">
          <div className="mx-auto max-w-[58rem] text-center text-sm text-muted-foreground">
            <p className="mb-2">© {new Date().getFullYear()} TenderWatch. All rights reserved.</p>
            <p className="text-xs">
              Released under the MIT License | Data sourced from{" "}
              <a 
                href="https://web.pcc.gov.tw/"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                政府電子採購網
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
