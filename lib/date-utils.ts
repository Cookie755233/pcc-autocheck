import { format, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Tender } from '@/types/tender'

//@ Format YYYYMMDD to date string
export function formatTenderDate(dateString: string): string {
  try {
    //@ Parse the ISO date string and format it
    const date = parseISO(dateString)
    return format(date, 'MMMM yyyy', { locale: zhTW })
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}

//@ Helper to sort tenders by date
export function sortTendersByDate(tenders: Tender[]): Tender[] {
  return [...tenders].sort((a, b) => {
    const dateA = new Date(a.publishedAt)
    const dateB = new Date(b.publishedAt)
    return dateB.getTime() - dateA.getTime()
  })
} 