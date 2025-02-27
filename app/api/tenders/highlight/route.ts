import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib'
import { auth } from '@clerk/nextjs'
import { serializeData } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Parse the request body
    const body = await req.json()
    console.log('Highlight request:', body)
    
    // Extract tenderId and isHighlighted from the request
    let { tenderId, isHighlighted } = body
    
    // Check if tenderId is an object (the full tender) or a string
    // If it's an object, extract the id
    if (typeof tenderId === 'object' && tenderId !== null) {
      tenderId = tenderId.id
    }
    
    if (!tenderId || typeof isHighlighted !== 'boolean') {
      return new NextResponse('Invalid request data', { status: 400 })
    }

    // Find the tender view
    const tenderView = await db.tenderView.findFirst({
      where: {
        userId,
        tenderId: tenderId
      }
    })

    if (!tenderView) {
      return new NextResponse('Tender view not found', { status: 404 })
    }

    // Update the tender view
    const updatedTenderView = await db.tenderView.update({
      where: {
        id: tenderView.id
      },
      data: {
        isHighlighted,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(updatedTenderView)
  } catch (error) {
    console.error('Error updating tender highlight status:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 