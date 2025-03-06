"use client";

import React, { useRef, useEffect, useState, useCallback, MouseEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { MinusCircle, CheckCircle, Check, Loader2, PlusCircle, Sparkles, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  getKeywordsAction,
  addKeywordAction,
  deleteKeywordAction,
  toggleEmailNotificationsAction
} from "@/app/actions/settings-actions";
import { Keyword } from "@prisma/client";
import { useSubscription } from '@/lib/contexts/subscription-context';
import { CancelSubscriptionDialog } from "@/components/cancel-subscription-dialog";

//? Define subscription tiers and their features
const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    price: "0",
    description: "Basic features for getting started",
    features: [
      "Up to 5 saved keywords",
      "Basic email notifications",
      "7-day tender history"
    ],
    action: "Current Plan"
  },
  pro: {
    name: "Pro",
    price: "19.99",
    description: "Advanced features for power users",
    features: [
      "Unlimited saved keywords",
      "Selective email notifications",
      "Advanced timeline analytics",
      "Export to PDFs",
      "30-day tender history",
    ],
    action: "Upgrade"
  }
};

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useUser();
  const router = useRouter();

  //? State for user's saved keywords from database
  const [keywords, setKeywords] = React.useState<Keyword[]>([]);
  const [newKeyword, setNewKeyword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);

  //? User information from Clerk
  const { toast: clerkToast } = useToast();

  //? State for notification settings
  const [emailNotifications, setEmailNotifications] = React.useState(true);

  // Use the subscription context
  const {
    subscriptionTier,
    subscriptionStatus,
    refreshSubscription,
    subscriptionId  // Get from context
  } = useSubscription();

  // Add a ref to track if we've already processed the subscription success
  const hasProcessedSubscription = useRef(false);

  // Add state to prevent infinite loops
  const isCancellingRef = useRef(false);

  // Add state to track if we're processing a subscription
  const [isProcessingSubscription, setIsProcessingSubscription] = useState(false);

  // Add this ref
  const isVerifyingRef = useRef(false);

  // Make sure this ref is defined at the top level of your component
  const pendingSubscriptionId = useRef<string | null>(null);

  // Store the current subscription ID when it's loaded
  const [currentSubscriptionId, setCurrentSubscriptionId] = useState<string | null>(null);

  // Add a counter for verification attempts
  const verificationAttempts = useRef(0);

  // Add this state to track the current and previous tab
  const [activeTab, setActiveTab] = useState<string>("subscription");
  const previousTabRef = useRef<string>("subscription");

  // Add this handler to manage tab transitions
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Add state for cancel subscription dialog
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  //@ Fetch user data including keywords and subscription status
  React.useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        console.log("Fetching user data");

        // Get user data 
        const userResponse = await fetch('/api/auth/init');
        const userData = await userResponse.json();

        if (userData.success && userData.user) {
          // Set email notifications from user data
          setEmailNotifications(userData.user.emailNotifications || false);
          console.log("User data fetched:", userData.user);
        }

        // Fetch keywords
        const keywordsResponse = await getKeywordsAction();
        if (keywordsResponse.success && keywordsResponse.data) {
          setKeywords(keywordsResponse.data);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchUserData();
    }
  }, [user, toast]);

  //@ Handle adding a new keyword using server action
  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return;

    setIsLoading(true);

    try {
      const result = await addKeywordAction(newKeyword.trim());

      if (result.success && result.data) {
        setKeywords([result.data, ...keywords]);
        setNewKeyword("");
        toast({
          title: "Keyword added",
          description: `"${newKeyword.trim()}" has been added to your saved keywords.`,
          variant: "success"
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add keyword",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error adding keyword:", error);
      toast({
        title: "Error saving keyword",
        description: "There was an error saving your keyword.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  //@ Handle removing a keyword using server action
  const handleRemoveKeyword = async (keywordId: string, text: string) => {
    setIsLoading(true);

    try {
      const result = await deleteKeywordAction(keywordId);

      if (result.success) {
        setKeywords(prev => prev.filter(k => k.id !== keywordId));
        toast({
          title: "Keyword removed",
          description: `"${text}" has been removed from your saved keywords.`,
          variant: "warning"
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to remove keyword",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error removing keyword:", error);
      toast({
        title: "Error removing keyword",
        description: "There was an error removing your keyword.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update the useEffect for PayPal return
  useEffect(() => {
    const handlePayPalReturn = async () => {
      // Check if we've already processed this subscription return to prevent duplicates
      if (hasProcessedSubscription.current) {
        console.log("Already processed subscription return, skipping");
        return;
      }

      // Check if we're returning from PayPal - PayPal sandbox returns ba_token and token
      const subscriptionId = searchParams.get('subscription_id');
      const baToken = searchParams.get('ba_token');
      const token = searchParams.get('token');

      // Log all search params for debugging
      console.log("Search params from PayPal return:",
        Object.fromEntries([...searchParams.entries()]));

      // PayPal can return either ba_token for billing agreements, or token for direct payments
      const paypalToken = token || baToken;

      if (subscriptionId && paypalToken) {
        console.log("Detected return from PayPal:", { subscriptionId, paypalToken });

        try {
          // Set flag to prevent duplicate processing
          hasProcessedSubscription.current = true;

          setIsProcessingSubscription(true);

          // Verify the subscription with the token
          const response = await fetch('/api/subscriptions/verify-by-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              token: paypalToken,
              subscriptionId: subscriptionId
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to verify subscription');
          }

          const data = await response.json();
          console.log("Subscription verified:", data);

          // Clean up URL parameters
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);

          // Refresh subscription data after successful verification
          if (refreshSubscription) {
            console.log("Refreshing subscription data...");
            await refreshSubscription();
          }

          // Show success toast
          toast({
            title: "Subscription Activated!",
            description: "Your pro subscription has been successfully activated.",
            variant: "hype"
          });
        } catch (error: any) {
          console.error('Error verifying subscription:', error);
          toast({
            title: "Subscription Error",
            description: error.message || "Failed to verify your subscription. Please try again.",
            variant: "destructive"
          });
          // Reset flag in case of error so user can try again
          hasProcessedSubscription.current = false;
        } finally {
          setIsProcessingSubscription(false);
        }
      }
    };

    // Only run if there are some parameters in the URL that might indicate a PayPal return
    if (searchParams.size > 0) {
      handlePayPalReturn();
    }
  }, [searchParams, toast, refreshSubscription]);

  //@ Handle subscription cancellation
  const handleCancelSubscription = async () => {
    // Debug log
    console.log("Cancel subscription button clicked, subscription ID:", subscriptionId);

    // Instead of immediately cancelling, open the confirmation dialog
    setIsCancelDialogOpen(true);
  };

  //@ Handle actual subscription cancellation after confirmation
  const handleConfirmCancellation = async () => {
    // Prevent multiple clicks
    if (isCancellingRef.current) return;
    isCancellingRef.current = true;

    setIsProcessingSubscription(true);

    try {
      if (!subscriptionId) {
        console.warn("No subscription ID found for cancellation");
        toast({
          title: "Error",
          description: "No active subscription found to cancel",
          variant: "destructive"
        });
        return;
      }

      console.log("Cancelling subscription:", subscriptionId);

      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscriptionId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Subscription Cancelled",
          description: "Your subscription has been cancelled successfully",
          variant: "success"
        });

        // Clear the stored subscription ID
        setCurrentSubscriptionId(null);

        // Reset verification state to prevent loops
        if (pendingSubscriptionId.current) {
          pendingSubscriptionId.current = null;
        }

        // Refresh subscription data
        await refreshSubscription();
      } else {
        throw new Error(result.error || "Failed to cancel subscription");
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingSubscription(false);
      // Reset after a delay to prevent rapid re-clicks
      setTimeout(() => {
        isCancellingRef.current = false;
      }, 1000);
    }
  };

  //@ Handle email notification changes using server action
  const handleEmailNotificationChange = async () => {
    setIsLoading(true);

    try {
      const result = await toggleEmailNotificationsAction();

      if (result.success) {
        // Update local state with the new value from the server
        setEmailNotifications(result.enabled || false);
        toast({
          title: "Settings updated",
          description: `Email notifications ${result.enabled ? "enabled" : "disabled"}.`,
          variant: "success"
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update notification settings",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error updating notification settings:", error);
      toast({
        title: "Error updating settings",
        description: "There was an error updating your notification settings.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fix the handleSubscribe function's error handling
  const handleSubscribe = async () => {
    try {
      setIsProcessingSubscription(true);

      toast({
        title: "Processing...",
        description: "Preparing your subscription...",
      });

      // Create return and cancel URLs
      const baseUrl = window.location.origin;
      const returnUrl = `${baseUrl}/dashboard/settings`;
      const cancelUrl = `${baseUrl}/dashboard/settings?canceled=true`;

      console.log("Initiating subscription creation:", { returnUrl, cancelUrl });

      // Call API to create subscription
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnUrl, cancelUrl }),
      });

      console.log("Subscription creation response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Subscription creation error:", errorData);
        throw new Error(errorData.error || 'Failed to create subscription');
      }

      const data = await response.json();
      console.log("Subscription created successfully:", data);

      // Redirect to PayPal approval URL
      if (data.approvalUrl) {
        console.log("Redirecting to PayPal:", data.approvalUrl);
        window.location.href = data.approvalUrl;
      } else {
        throw new Error('No approval URL returned');
      }
    } catch (error: any) { // Type error as any to fix TypeScript error
      console.error("Error creating subscription:", error);
      toast({
        title: "Subscription Error",
        description: error.message || "Failed to create subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingSubscription(false);
    }
  };

  // Update the renderSubscriptionCard function
  const cardRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const [isAfraid, setIsAfraid] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!cardRef.current || !cancelButtonRef.current || isProcessingSubscription) return;

    const cardRect = cardRef.current.getBoundingClientRect();
    const buttonRect = cancelButtonRef.current.getBoundingClientRect();

    const cursorX = e.clientX - cardRect.left;
    const cursorY = e.clientY - cardRect.top;

    const buttonCenterX = buttonRect.left + buttonRect.width / 2 - cardRect.left;
    const buttonCenterY = buttonRect.top + buttonRect.height / 2 - cardRect.top;

    const distanceX = cursorX - buttonCenterX;
    const distanceY = cursorY - buttonCenterY;

    const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);
    const dangerZone = 1000;

    if (distance < dangerZone) {
      const intensity = (1 - distance / dangerZone);
      const moveX = Math.min(Math.max(distanceX * -intensity * 2, -300), 300);
      const moveY = Math.min(Math.max(distanceY * -intensity * 2, -200), 200);

      cancelButtonRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
      cancelButtonRef.current.style.transition = 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)';
      cancelButtonRef.current.firstElementChild!.classList.add('shiver');

      if (!isAfraid) setIsAfraid(true);
    }
  }, [isProcessingSubscription, isAfraid]);

  const handleMouseLeave = useCallback(() => {
    if (!cancelButtonRef.current) return;
    cancelButtonRef.current.style.transform = 'translate(0, 0)';
    cancelButtonRef.current.style.transition = 'transform 0.5s ease-in-out';
    cancelButtonRef.current.firstElementChild!.classList.remove('shiver');

    setIsAfraid(false);
  }, []);

  // Add CSS keyframes for shivering effect
  useEffect(() => {
    if (typeof window === 'undefined') return; // Ensure this runs only on the client

    const styleSheet = document.styleSheets[0];

    const keyframes = `
    @keyframes shiver {
      0%, 100% { transform: translate(0, 0); }
      25% { transform: translate(-2px, 2px); }
      50% { transform: translate(2px, -2px); }
      75% { transform: translate(-2px, -2px); }
    }`;
    styleSheet.insertRule(keyframes, styleSheet.cssRules.length);

    const shiverClass = `
    .shiver {
      animation: shiver 0.2s infinite;
    }`;
    styleSheet.insertRule(shiverClass, styleSheet.cssRules.length);
  }, []);

  // Update the Card component JSX
  const renderSubscriptionCard = (tier: keyof typeof SUBSCRIPTION_TIERS) => {
    const isCurrentTier = subscriptionTier === tier;

    return (
      <Card
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        key={tier}
        className={cn(
          "flex flex-col h-full border-2 transition-all relative rounded-lg",
          tier === "pro" ? [
            "shadow-lg hover:shadow-xl hover:-translate-y-1",
            "before:absolute before:inset-0 before:-z-10",
            "before:bg-gradient-to-r before:from-purple-400/20 before:via-pink-500/20 before:to-red-500/20",
            "before:opacity-0 hover:before:opacity-100 before:transition-opacity",
            "after:absolute after:inset-0 after:-z-20",
            "after:bg-gradient-to-r after:from-purple-400/30 after:via-pink-500/30 after:to-red-500/30",
            "after:blur-xl after:opacity-0 hover:after:opacity-20 after:transition-opacity",
            "bg-gradient-to-b from-background to-secondary/5"
          ].join(" ") : "",
          isCurrentTier ? [
            "border-primary",
            "before:absolute before:inset-0 before:-z-10",
            "before:bg-gradient-to-r before:from-purple-400/10 before:via-pink-500/10 before:to-red-500/10",
            "before:opacity-100"
          ].join(" ") : "border-border"
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {SUBSCRIPTION_TIERS[tier].name}
            {isCurrentTier && (
              <Badge
                variant="default"
              >
                Current
              </Badge>
            )}
          </CardTitle>
          <CardDescription>{SUBSCRIPTION_TIERS[tier].description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <div className="text-3xl font-bold mb-4">
            <span className={cn(
              tier === "pro" && "bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent"
            )}>
              ${SUBSCRIPTION_TIERS[tier].price}
            </span>
            {tier === "free" ? "" : "/mo"}
          </div>
          <ul className="space-y-2">
            {SUBSCRIPTION_TIERS[tier].features.map((feature, index) => (
              <li key={index} className="flex items-center">
                <CheckCircle className={cn(
                  "mr-2 h-4 w-4",
                  tier === "pro" ? "text-pink-500" : "text-gray-400"
                )} />
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="mt-auto">
          {tier === "pro" && subscriptionTier === "free" && (
            <Button
              className={cn(
                "w-full shadow-md hover:shadow-lg relative group overflow-hidden",
                "bg-gradient-to-r from-purple-400 via-pink-500 to-red-500",
                "text-white hover:scale-[1.02] transition-transform duration-300"
              )}
              onClick={handleSubscribe}
              disabled={isProcessingSubscription}
            >
              {isProcessingSubscription ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Upgrade Now"
              )}
            </Button>
          )}
          {tier === "pro" && subscriptionTier === "pro" && (
            <Button
              ref={cancelButtonRef}
              className={cn(
                "w-full transition-all duration-200",
                "hover:bg-destructive hover:text-white hover:shadow-lg",
                "relative group overflow-hidden"
              )}
              variant="outline"
              onClick={handleCancelSubscription}
              disabled={isProcessingSubscription}
            >
              <span className="relative inline-flex items-center gap-2">
                {isProcessingSubscription ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="relative">Cancel Subscription</span>
                    {isAfraid && (
                      <span className="text-xs text-muted-foreground italic hover:text-white">(Please Don't)</span>
                    )}
                  </>
                )}
              </span>
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  useEffect(() => {
    // Log when subscription tier changes
    console.log("Subscription tier changed to:", subscriptionTier);
  }, [subscriptionTier]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <Tabs defaultValue="subscription" className="w-full" onValueChange={handleTabChange}>
        <TabsList className="mb-8">
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {(Object.keys(SUBSCRIPTION_TIERS) as Array<keyof typeof SUBSCRIPTION_TIERS>).map(tier =>
              renderSubscriptionCard(tier as keyof typeof SUBSCRIPTION_TIERS)
            )}
          </div>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Saved Keywords</CardTitle>
              <CardDescription>
                Keywords you are subscribed to. New tenders containing these keywords will appear in your dashboard.
                {subscriptionTier === 'free' && keywords.length >= 5 && (
                  <div className="mt-2 text-yellow-600 dark:text-yellow-400">
                    <strong>Note:</strong> You've reached the limit of 5 keywords for free accounts.
                    <Button variant="link" className="p-0 h-auto ml-1" onClick={() => setActiveTab('subscription')}>
                      Upgrade for unlimited keywords.
                    </Button>
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddKeyword();
                  }}
                  className="flex space-x-2"
                >
                  <Input
                    placeholder="Add a new keyword..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    disabled={isLoading || (subscriptionTier === 'free' && keywords.length >= 5)}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !newKeyword.trim() || (subscriptionTier === 'free' && keywords.length >= 5)}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                  </Button>
                </form>

                <div className="space-y-2">
                  {isLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : keywords.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No keywords added yet. Add some to get started.
                    </div>
                  ) : (
                    keywords.map((keyword) => (
                      <div
                        key={keyword.id}
                        className="flex items-center justify-between py-3 px-6 bg-background rounded-md border group hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center gap-10">
                          <Switch
                            checked={keyword.isActive}
                            disabled={isLoading}
                            onCheckedChange={(checked) => {
                              // TODO: Add toggle functionality
                              console.log('Toggle keyword:', keyword.id, checked);
                            }}
                          />
                          <div>
                            <div className="font-medium">{keyword.text}</div>
                            <div className="text-xs text-muted-foreground">
                              {keyword.isActive ? 'Active' : 'Paused'}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveKeyword(keyword.id, keyword.text)}
                          disabled={isLoading}
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MinusCircle className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>Manage your account details and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4 gap-10 pl-4">
                <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback>{user?.firstName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-2xl font-medium">{user?.firstName} {user?.lastName}</h3>
                  <p className="text-sm text-muted-foreground">{user?.emailAddresses[0].emailAddress}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={subscriptionTier === 'pro' ? "default" : "outline"} className={cn(
                      subscriptionTier === 'pro' && "bg-gradient-to-r from-purple-400/80 via-pink-500/80 to-red-500/80"
                    )}>
                      {subscriptionTier === 'pro' ? "Pro Plan" : "Free Plan"}
                    </Badge>
                    {subscriptionTier === 'pro' && (
                      <Badge variant="outline" className="border-green-500 text-green-500">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid gap-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">Email Preferences</h4>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">Tender Notifications</label>
                      <p className="text-sm text-muted-foreground">
                        Receive email alerts for new matching tenders
                      </p>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={handleEmailNotificationChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* PayPal return handler */}
      <div className="hidden">
        {/* This useEffect will handle PayPal returns */}
      </div>

      {/* Cancel Subscription Dialog */}
      <CancelSubscriptionDialog 
        isOpen={isCancelDialogOpen}
        setIsOpen={setIsCancelDialogOpen}
        onConfirm={handleConfirmCancellation}
        isLoading={isProcessingSubscription}
      />
    </div>
  );
} 