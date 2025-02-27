import { NextResponse } from 'next/server'
import { db } from '@/lib'
import { auth } from '@clerk/nextjs'
import { Tender, TenderGroup } from '@/types/tender'
import { Prisma } from '@prisma/client'
import { serializeData } from '@/lib/utils'

//@ Define proper return type for the tender data
interface TenderData extends Tender {
  id: string
  archived: boolean
  currentVersion: number
  totalVersions: number
  tags: string[]
  versions: {
    version: number
    data: any
    createdAt: Date
  }[]
}

//@ Define types that match Prisma schema
type TenderViewWithTender = Prisma.TenderViewGetPayload<{
  include: {
    tender: {
      include: {
        versions: {
          orderBy: { version: 'desc' }
        }
      }
    }
  }
}>

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userIdParam = searchParams.get('userId')
    
    if (userIdParam !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    console.log(`Fetching tender views for user: ${userId}`)

    const tenderViews = await db.tenderView.findMany({
      where: { userId },
      include: {
        tender: {
          include: {
            versions: {
              orderBy: { date: 'desc' }
            }
          }
        }
      }
    })

    console.log(`Found tender views: ${tenderViews.length}`)

    // Format the data to match the structure used in real-time updates
    const formattedTenders = tenderViews.map(view => {
      const latestVersion = view.tender.versions[0];
      
      return {
        tender: {
          ...view.tender,
          id: view.tenderId,
          unit_id: view.tenderId.split('unit_id=')[1]?.split('&')[0] || '',
          job_number: view.tenderId.split('job_number=')[1] || '',
          date: latestVersion?.date ? Number(latestVersion.date) : Date.now(),
          title: latestVersion?.data?.brief?.title || 'No title',
          isArchived: view.isArchived,
          isHighlighted: view.isHighlighted || false,
          brief: latestVersion?.data?.brief || {}
        },
        versions: view.tender.versions.map(v => ({
          ...v,
          date: v.date.toString(),
          data: {
            ...v.data,
            brief: v.data?.brief || {}
          }
        })),
        relatedTenders: []
      };
    });

    return NextResponse.json(serializeData(formattedTenders))
  } catch (error) {
    console.error('Error fetching tender views:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tender views' },
      { status: 500 }
    )
  }
} 