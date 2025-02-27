import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Tender } from '@/types/tender'

export function useTenders(keywords: string[]) {
  const { user } = useUser()
  const [tenders, setTenders] = useState<Tender[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  //@ Fetch tenders only when keywords change or on manual refresh
  const fetchTenders = async (forceRefresh = false) => {
    if (!keywords.length || !user) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      //? Fetch tenders for each keyword
      const results = await Promise.all(
        keywords.map(async (keyword) => {
          const response = await fetch(`/api/tenders/search?keyword=${encodeURIComponent(keyword)}`)
          if (!response.ok) throw new Error('Failed to fetch tenders')
          return response.json()
        })
      )
      
      //? Merge and deduplicate results
      const mergedTenders = Array.from(
        new Map(
          results.flat().map(tender => [tender.id, tender])
        ).values()
      )
      
      setTenders(mergedTenders)
    } catch (err) {
      console.error('Error fetching tenders:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch tenders'))
    } finally {
      setIsLoading(false)
    }
  }

  //@ Only fetch when keywords change
  useEffect(() => {
    fetchTenders()
  }, [keywords]) // Remove the interval-based fetching

  return { tenders, isLoading, error, refetch: () => fetchTenders(true) }
} 