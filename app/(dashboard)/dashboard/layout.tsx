"use client"

import * as React from "react"
import { UserButton } from "@clerk/nextjs"
import { ModeToggle } from "@/components/ui/mode-toggle"
import Link from "next/link"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            TenderWatch
          </Link>
          <div className="flex items-center gap-4">
            <ModeToggle />
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  )
} 