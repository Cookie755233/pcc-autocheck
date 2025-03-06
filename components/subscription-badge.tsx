"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/lib/contexts/subscription-context';
import { Sparkles } from 'lucide-react';
import { cva } from 'class-variance-authority';

// Create badge variants with better styling
const badgeVariants = cva(
  "flex items-center gap-1 transition-all duration-300",
  {
    variants: {
      tier: {
        free: "bg-muted text-muted-foreground border-muted-foreground/30",
        pro: "bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-white border-transparent shadow-sm hover:shadow-lg h-6"
      }
    },
    defaultVariants: {
      tier: "free"
    }
  }
);

export function SubscriptionBadge() {
  const { subscriptionTier, isLoading } = useSubscription();
  
  //? Debug logging for subscription tier
  React.useEffect(() => {
    console.log('Subscription Badge - Current tier:', subscriptionTier);
  }, [subscriptionTier]);
  
  if (isLoading) {
    return (
      <Badge variant="outline" className="text-muted-foreground animate-pulse">
        Loading...
      </Badge>
    );
  }
  
  return (
    <Badge 
      variant="outline"
      className={badgeVariants({ tier: subscriptionTier as 'free' | 'pro' })}
    >
      {subscriptionTier === 'pro' && <Sparkles className="h-3 w-3" />}
      {subscriptionTier === 'pro' ? 'Pro' : 'Free'}
    </Badge>
  );
} 