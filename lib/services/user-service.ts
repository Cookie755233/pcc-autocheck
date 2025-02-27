import { db } from '@/lib'

export const userService = {
  //@ Ensure user exists in database
  async ensureUser(userId: string, email?: string) {
    return db.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: email || `${userId}@placeholder.com`,
      },
      update: {
        email: email || undefined,
      }
    })
  }
} 