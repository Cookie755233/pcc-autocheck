import { db } from '@/lib'
import { auth } from '@clerk/nextjs'

export const userService = {
  //@ Ensure user exists in database
  async ensureUser(clerkId: string, email?: string | null): Promise<User> {
    console.log(`Ensuring user exists: clerkId=${clerkId}, email=${email || 'undefined'}`);
    
    try {
      // Try to find existing user
      const existingUser = await db.user.findUnique({
        where: { id: clerkId }
      });
      
      if (existingUser) {
        // Update email if it's provided and different from existing
        if (email && existingUser.email !== email) {
          console.log(`Updating email for user ${clerkId} from ${existingUser.email} to ${email}`);
          return db.user.update({
            where: { id: clerkId },
            data: { email }
          });
        }
        return existingUser;
      }
      
      // Create new user
      console.log(`Creating new user: clerkId=${clerkId}, email=${email || 'undefined'}`);
      return db.user.create({
        data: {
          id: clerkId,
          email: email || `user-${clerkId.substring(0, 8)}@example.com`, // Fallback email if none provided
          subscriptionTier: 'free',
          subscriptionStatus: null,
          emailNotifications: false
        }
      });
    } catch (error) {
      console.error('Error in ensureUser:', error);
      throw error;
    }
  },

  //@ Get user with subscription details
  async getUserWithSubscription(userId: string) {
    return db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
        subscriptionId: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        emailNotifications: true,
        createdAt: true,
        updatedAt: true
      }
    });
  },

  //@ Check if user has pro subscription
  async hasProSubscription(userId: string) {
    const user = await this.getUserWithSubscription(userId);
    
    if (!user) return false;
    
    return user.subscriptionTier === 'pro' && 
           user.subscriptionStatus === 'ACTIVE' && 
           (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date());
  },

  //@ Update user email notification preferences
  async updateEmailNotifications(userId: string, enabled: boolean) {
    return db.user.update({
      where: { id: userId },
      data: {
        emailNotifications: enabled
      }
    });
  },

  async updateSubscription(userId: string, tier: 'free' | 'pro', status: string | null, subscriptionId?: string): Promise<User> {
    console.log(`Updating subscription: userId=${userId}, tier=${tier}, status=${status}, subscriptionId=${subscriptionId || 'none'}`);
    
    return db.user.update({
      where: { id: userId },
      data: { 
        subscriptionTier: tier,
        subscriptionStatus: status,
        // Store subscription ID if provided
        ...(subscriptionId ? { subscriptionId } : {})
      }
    });
  }
} 