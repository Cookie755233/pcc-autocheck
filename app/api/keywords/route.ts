import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { db } from '@/lib'
import { getUserKeywords, addKeyword, deleteKeyword } from '@/lib/services/keyword-service'
import { userService } from '@/lib/services/user-service'

export async function GET() {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Ensure user exists first
    await db.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: `${userId}@placeholder.com`, // Required by schema
      },
      update: {} // No updates needed
    })

    // Make sure we select all fields including isActive
    const keywords = await db.keyword.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        text: true,
        userId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    // console.log('Fetched keywords with isActive:', keywords);
    return NextResponse.json(keywords)
  } catch (error) {
    console.error('Error fetching keywords:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { text } = await request.json()
    if (!text?.trim()) {
      return new NextResponse('Keyword is required', { status: 400 })
    }

    // Get email from Clerk
    const { sessionClaims } = auth();
    const email = sessionClaims?.email as string;
    
    console.log('Keywords API - User info:', { userId, email });

    // Ensure user exists first with proper email
    await userService.ensureUser(userId, email);

    // Use upsert instead of create to handle duplicates
    const keyword = await db.keyword.upsert({
      where: {
        userId_text: {
          userId,
          text: text.toLowerCase().trim()
        }
      },
      create: {
        userId,
        text: text.toLowerCase().trim(),
        isActive: true // Set to active by default
      },
      update: {
        isActive: true // Reactivate if it already exists
      }
    })

    return NextResponse.json(keyword)
  } catch (error) {
    console.error('Error adding keyword:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const keywordId = searchParams.get('id')
    
    if (!keywordId) {
      return new NextResponse('Keyword ID is required', { status: 400 })
    }

    await deleteKeyword(userId, keywordId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting keyword:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 