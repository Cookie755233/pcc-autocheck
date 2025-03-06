import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs';
import { userService } from '@/lib/services/user-service';

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user email from Clerk using currentUser() instead of sessionClaims
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    
    // console.log('Auth init route - User info:', { 
    //   userId, 
    //   email,
    //   hasEmailAddresses: user?.emailAddresses ? 'yes' : 'no'
    // });
    
    if (!email) {
      console.log('No email found in Clerk user data');
    }
    
    // Initialize user in database
    const dbUser = await userService.ensureUser(userId, email);
    
    return NextResponse.json({ 
      success: true, 
      user: {
        id: dbUser.id,
        email: dbUser.email,
        subscriptionTier: dbUser.subscriptionTier,
        subscriptionStatus: dbUser.subscriptionStatus,
        subscriptionId: dbUser.subscriptionId,
        emailNotifications: dbUser.emailNotifications
      }
    });
  } catch (error) {
    console.error('Error initializing user:', error);
    return NextResponse.json(
      { error: 'Failed to initialize user' },
      { status: 500 }
    );
  }
} 