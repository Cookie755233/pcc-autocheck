"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useToast } from "@/components/ui/use-toast"

interface Tender {
  id: string
  title: string
  date: string | number
  keywords: string[]
  // Add other tender properties as needed
}

interface UseSubscribedTendersReturn {
  tenders: Tender[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useSubscribedTenders(): UseSubscribedTendersReturn {
  const [tenders, setTenders] = useState<Tender[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useUser()
  const { toast } = useToast()

  //@ Fetch subscribed tenders for the current user
  async function fetchTenders() {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      //? Fetch user's keywords from your database
      const response = await fetch(`/api/users/${user.id}/keywords`)
      const { keywords } = await response.json()

      //? Fetch tenders for each keyword
      const tenderPromises = keywords.map(async (keyword: string) => {
        const res = await fetch(`https://pcc.g0v.ronny.tw/api/searchbytitle?query=${keyword}`)
        const data = await res.json()
        return data.map((tender: any) => ({
          ...tender,
          keywords: [keyword] // Track which keyword matched this tender
        }))
      })

      const allTenders = await Promise.all(tenderPromises)
      
      //@ Flatten and deduplicate tenders
      const uniqueTenders = Array.from(
        new Map(
          allTenders.flat().map(tender => [tender.id, tender])
        ).values()
      )

      setTenders(uniqueTenders)
    } catch (err) {
      console.error("Error fetching tenders:", err)
      setError(err instanceof Error ? err : new Error("Failed to fetch tenders"))
      toast({
        title: "Error",
        description: "Failed to fetch tenders. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  //@ Fetch tenders on mount and when user changes
  useEffect(() => {
    fetchTenders()
  }, [user?.id])

  return {
    tenders,
    isLoading,
    error,
    refetch: fetchTenders
  }
} 