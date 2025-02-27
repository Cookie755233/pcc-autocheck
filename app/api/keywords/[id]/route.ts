import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { deleteKeyword, updateKeyword } from '@/lib/services/keyword-service'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    await deleteKeyword(userId, params.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting keyword:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const updateData = await request.json()
    console.log(`Updating keyword ${params.id} for user ${userId}:`, updateData);

    const keyword = await updateKeyword(userId, params.id, updateData)
    
    // console.log('Updated keyword:', keyword);
    return NextResponse.json(keyword)
  } catch (error) {
    console.error('Error updating keyword:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 