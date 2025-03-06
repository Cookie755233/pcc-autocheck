import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs';
import { userService } from '@/lib/services/user-service';
import { db } from '@/lib/db'; // Make sure this import is correct

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get subscription ID from request body
    const { subscriptionId } = await req.json();
    
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing subscription ID' },
        { status: 400 }
      );
    }
    
    console.log(`Processing cancellation for subscription ${subscriptionId}, user ${userId}`);
    
    try {
      // In a real app, we would call the payment provider's API to cancel the subscription
      
      // Update user's subscription in the database directly
      await db.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: 'free',
          subscriptionStatus: null,
          subscriptionId: null
        }
      });
      
      // Update Clerk user metadata
      await clerkClient.users.updateUser(userId, {
        publicMetadata: {
          subscriptionTier: 'free',
          subscriptionStatus: null,
          subscriptionId: null
        }
      });
      
      console.log(`Subscription ${subscriptionId} successfully cancelled`);
      
      return NextResponse.json({ 
        success: true
      });
    } catch (cancelError) {
      console.error('Error during cancellation process:', cancelError);
      return NextResponse.json(
        { error: 'Failed to process cancellation: ' + (cancelError.message || 'Unknown error') },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
} 