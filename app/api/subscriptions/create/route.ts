import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs';
import { paypalService } from '@/lib/services/paypal-service';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const { returnUrl, cancelUrl } = await request.json();
    
    if (!returnUrl || !cancelUrl) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    console.log("Creating subscription for user:", user.id);
    
    // Generate subscription link with PayPal
    const result = await paypalService.generateSubscriptionLink(
      user.id,
      returnUrl,
      cancelUrl
    );
    
    console.log("Subscription link generated:", result);
    
    return NextResponse.json({ 
      success: true, 
      subscriptionId: result.subscriptionId,
      approvalUrl: result.approvalUrl
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription: ' + error.message },
      { status: 500 }
    );
  }
} 