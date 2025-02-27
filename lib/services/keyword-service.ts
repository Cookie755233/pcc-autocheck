import { db } from '@/lib'
import { Keyword } from '@prisma/client'

//@ Get all keywords for a user
export async function getUserKeywords(userId: string): Promise<Keyword[]> {
  return db.keyword.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  })
}

//@ Add a new keyword for a user
export async function addKeyword(userId: string, text: string): Promise<Keyword> {
  return db.keyword.create({
    data: {
      userId,
      text: text.toLowerCase().trim(),
      isActive: true // Set to active by default
    }
  })
}

//@ Delete a keyword
export async function deleteKeyword(userId: string, keywordId: string): Promise<void> {
  await db.keyword.deleteMany({
    where: {
      id: keywordId,
      userId // Ensure user owns the keyword
    }
  })
}

//@ Update keyword (can update any field including isActive)
export async function updateKeyword(userId: string, keywordId: string, data: Partial<Keyword>): Promise<Keyword> {
  console.log(`Service: Updating keyword ${keywordId} for user ${userId}`, data);
  
  try {
    const result = await db.keyword.update({
      where: {
        id: keywordId,
        userId // Ensure user owns the keyword
      },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
    
    // console.log('Update result:', result);
    return result;
  } catch (error) {
    console.error('Error in updateKeyword:', error);
    throw error;
  }
} 