"use client"

import useSWR from 'swr'
import { useEffect } from 'react'

export function KanbanBoard() {
  const { data, mutate } = useSWR('/api/tenders/views', fetcher)
  
  // Listen for tender updates
  useEffect(() => {
    const channel = new BroadcastChannel('tender-updates')
    channel.onmessage = (event) => {
      if (event.data === 'refresh') {
        mutate() // Refresh the data
      }
    }
    return () => channel.close()
  }, [mutate])

  // ... rest of your component
} 