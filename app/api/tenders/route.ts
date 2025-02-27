import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { 
  searchTenders, 
  processTenders, 
  getUserTendersWithVersions 
} from '@/lib/services/tender-service'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')

    if (query) {
      //? Search and store new tenders
      const apiTenders = await searchTenders(query)
      const results = await processTenders(apiTenders, userId)
      return NextResponse.json(results)
    } else {
      //? Get user's existing tenders
      const tenders = await getUserTendersWithVersions(userId)
      return NextResponse.json(tenders)
    }
  } catch (error) {
    console.error('Tender API error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tender } = await request.json()
    
    //@ Save or update tender and its latest version
    const result = await db.tender.upsert({
      where: { id: tender.id },
      update: {
        versions: {
          create: {
            data: tender,
            recordCount: tender.records?.length || 0,
            version: { increment: 1 }
          }
        }
      },
      create: {
        id: tender.id,
        versions: {
          create: {
            data: tender,
            recordCount: tender.records?.length || 0,
            version: 1
          }
        }
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    })

    //@ Create or update user's view of this tender
    await db.tenderView.upsert({
      where: {
        userId_tenderId: {
          userId,
          tenderId: tender.id
        }
      },
      update: {},
      create: {
        userId,
        tenderId: tender.id
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to save tender:', error)
    return NextResponse.json(
      { error: 'Failed to save tender' },
      { status: 500 }
    )
  }
} 