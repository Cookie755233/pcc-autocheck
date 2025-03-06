import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { paypalService } from '@/lib/services/paypal-service';

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
    
    // Verify subscription
    const result = await paypalService.verifySubscription(
      subscriptionId,
      userId
    );
    
    return NextResponse.json({ 
      success: true, 
      status: result.status
    });
  } catch (error) {
    console.error('Error verifying subscription:', error);
    return NextResponse.json(
      { error: 'Failed to verify subscription' },
      { status: 500 }
    );
  }
} 