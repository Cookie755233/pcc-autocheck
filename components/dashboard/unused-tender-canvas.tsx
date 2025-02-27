import { useMemo } from 'react'
import { format } from 'date-fns'
import { Tender } from '@/types/tender'
import { TenderCard } from './tender-card'

interface TenderCanvasProps {
  tenders: Tender[]
  groupBy: 'date' | 'status' | 'type'
}

export function TenderCanvas({ tenders, groupBy }: TenderCanvasProps) {
  //@ Group tenders by date using date-fns
  const groupedTenders = useMemo(() => {
    return tenders.reduce((acc, tender) => {
      const date = format(new Date(tender.publishedAt), 'MMMM yyyy')
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(tender)
      return acc
    }, {} as Record<string, Tender[]>)
  }, [tenders])

  return (
    <div className="grid gap-6">
      {Object.entries(groupedTenders).map(([date, tenders]) => (
        <div key={date} className="space-y-4">
          <h3 className="text-lg font-semibold">{date}</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tenders.map(tender => (
              <TenderCard key={tender.id} tender={tender} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
} 