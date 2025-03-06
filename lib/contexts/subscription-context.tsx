"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/components/ui/use-toast';

interface SubscriptionContextType {
  subscriptionTier: 'free' | 'pro';
  subscriptionStatus: string | null;
  subscriptionId: string | null;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscriptionTier: 'free',
  subscriptionStatus: null,
  subscriptionId: null,
  isLoading: true,
  refreshSubscription: async () => {}
});

export const useSubscription = () => useContext(SubscriptionContext);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'pro'>('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoaded: isUserLoaded } = useUser();
  const { toast } = useToast();
  
  // Add a ref to track the last fetch time to prevent duplicate fetches
  const lastFetchTime = React.useRef<number>(0);

  //@ Fetch subscription data from the server
  const fetchSubscriptionData = async () => {
    if (!user) return;
    
    // Prevent fetching too frequently (at least 1 second between fetches)
    const now = Date.now();
    if (now - lastFetchTime.current < 1000) {
      console.log('Skipping duplicate fetch, too soon after last fetch');
      return;
    }
    
    lastFetchTime.current = now;
    
    try {
      setIsLoading(true);
      
      // Initialize user if needed and get subscription data
      const userResponse = await fetch('/api/auth/init');
      const userData = await userResponse.json();
      
      if (userData.success && userData.user) {
        setSubscriptionTier(userData.user.subscriptionTier || 'free');
        setSubscriptionStatus(userData.user.subscriptionStatus);
        setSubscriptionId(userData.user.subscriptionId || null);
        
        //? Debug log for subscription data
        console.log('Subscription data loaded:', {
          tier: userData.user.subscriptionTier,
          status: userData.user.subscriptionStatus,
          id: userData.user.subscriptionId
        });
      }
    } catch (error) {
      console.error("Error fetching subscription data:", error);
      // Don't show toast on initial load errors to avoid confusion
      if (subscriptionTier !== 'free' || subscriptionStatus !== null) {
        toast({
          title: "Error",
          description: "Failed to load subscription information",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  //@ Initial fetch when user is available
  useEffect(() => {
    if (user && isUserLoaded) {
      fetchSubscriptionData();
    } else if (isUserLoaded && !user) {
      // Reset to default if user is not logged in
      setSubscriptionTier('free');
      setSubscriptionStatus(null);
      setSubscriptionId(null);
      setIsLoading(false);
    }
  }, [user, isUserLoaded]);

  //@ Function to manually refresh subscription data
  const refreshSubscription = async () => {
    await fetchSubscriptionData();
  };

  return (
    <SubscriptionContext.Provider 
      value={{ 
        subscriptionTier, 
        subscriptionStatus,
        subscriptionId,
        isLoading,
        refreshSubscription
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
} 