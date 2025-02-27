import { Button } from "@/components/ui/button"
import { SignInButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { ArrowRight, Search, Bell, Archive } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function LandingPage() {
  const { userId } = await auth()
  
  // Redirect to dashboard if user is already signed in
  if (userId) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-semibold">
              TenderWatch
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link href="#features" className="transition-colors hover:text-foreground/80">
                Features
              </Link>
              <Link href="#pricing" className="transition-colors hover:text-foreground/80">
                Pricing
              </Link>
              <Link href="/docs" className="transition-colors hover:text-foreground/80">
                Documentation
              </Link>
            </nav>
          </div>
          <SignInButton mode="modal">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </SignInButton>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
        <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
          <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl">
            Never Miss a{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
              Government Tender
            </span>
          </h1>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            Subscribe to keywords and get notified when new tenders match your interests. 
            Track and manage opportunities efficiently.
          </p>
          <div className="space-x-4">
            <SignInButton mode="modal">
              <Button size="lg" className="gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </SignInButton>
            <Button variant="outline" size="lg" asChild>
              <Link href="#features">
                Learn more
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container space-y-6 bg-slate-50 py-8 dark:bg-transparent md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            Features
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Everything you need to track government tenders effectively
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
          <div className="relative overflow-hidden rounded-lg border bg-background p-2">
            <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
              <Search className="h-12 w-12" />
              <div className="space-y-2">
                <h3 className="font-bold">Keyword Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Set up keywords and get matched with relevant tenders automatically
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg border bg-background p-2">
            <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
              <Bell className="h-12 w-12" />
              <div className="space-y-2">
                <h3 className="font-bold">Instant Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Get notified immediately when new matching tenders are published
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg border bg-background p-2">
            <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
              <Archive className="h-12 w-12" />
              <div className="space-y-2">
                <h3 className="font-bold">Organized Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Keep track of all your tenders in a clean, organized interface
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 