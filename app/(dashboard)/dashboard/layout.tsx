"use client"

import * as React from "react"
import { UserButton } from "@clerk/nextjs"
import { ModeToggle } from "@/components/ui/mode-toggle"
import Link from "next/link"
import { Bell, Check } from "lucide-react"
import { useNotifications } from "@/contexts/notification-context"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

function formatTenderDate(date: number | string | undefined): string {
  if (!date) return 'Recently';
  
  try {
    // If it's YYYYMMDD format
    if (typeof date === 'number') {
      const dateStr = date.toString();
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1;
      const day = parseInt(dateStr.substring(6, 8));
      return formatDistanceToNow(new Date(year, month, day), { addSuffix: true });
    }
    
    // If it's a timestamp
    const timestamp = Number(date);
    if (!isNaN(timestamp)) {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    }
    
    return 'Recently';
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Recently';
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { notifications, markAsRead, markAllAsRead } = useNotifications()
  const router = useRouter()

  const hasUnreadNotifications = notifications.length > 0

  const handleNotificationClick = (tenderId: string) => {
    markAsRead(tenderId)
    router.push(`/dashboard?highlight=${tenderId}`)
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="font-semibold">
              TenderWatch
            </Link>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="relative"
                >
                  <Bell className="h-5 w-5" />
                  {hasUnreadNotifications && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-4 py-2">
                  <h3 className="font-semibold">Notifications</h3>
                  {hasUnreadNotifications && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs"
                      onClick={markAllAsRead}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
                
                <div className="h-px bg-border" />
                
                {notifications.length === 0 ? (
                  <div className="py-4 px-2 text-center text-sm text-muted-foreground">
                    No new notifications
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.map((tender) => (
                      <DropdownMenuItem 
                        key={tender.tender.id}
                        className="p-3 cursor-pointer"
                        onClick={() => handleNotificationClick(tender.tender.id)}
                      >
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-medium">{tender.tender.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tender.tender.date).toLocaleDateString()}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <ModeToggle />
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 container py-4">
        {children}
      </main>
    </div>
  )
} 