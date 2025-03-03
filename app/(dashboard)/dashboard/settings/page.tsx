"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { MinusCircle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";
import { 
  getKeywordsAction,
  addKeywordAction,
  deleteKeywordAction,
  toggleEmailNotificationsAction 
} from "@/app/actions/settings-actions";
import { Keyword } from "@prisma/client";

//? Define subscription tiers and their features
const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    price: "0",
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
    features: [
      "Unlimited saved keywords",
      "Priority email notifications",
      "30-day tender history",
      "Advanced analytics",
      "Bulk export"
    ],
    action: "Upgrade"
  },
  enterprise: {
    name: "Enterprise",
    price: "49.99",
    features: [
      "All Pro features",
      "API access",
      "Custom integrations",
      "Dedicated support",
      "Team collaboration"
    ],
    action: "Contact Sales"
  }
};

export default function SettingsPage() {
  //? State for user's saved keywords from database
  const [keywords, setKeywords] = React.useState<Keyword[]>([]);
  const [newKeyword, setNewKeyword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  
  //? User information from Clerk
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  //? State for notification settings
  const [emailNotifications, setEmailNotifications] = React.useState(true);
  
  //? Current subscription tier (simulated for now)
  const [currentTier, setCurrentTier] = React.useState<keyof typeof SUBSCRIPTION_TIERS>("free");

  //@ Fetch user keywords using server action
  React.useEffect(() => {
    const fetchKeywords = async () => {
      try {
        setIsLoading(true);
        
        const result = await getKeywordsAction();
        
        if (result.success && result.data) {
          setKeywords(result.data);
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to load keywords",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          title: "Error fetching data",
          description: "There was an error loading your settings.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      fetchKeywords();
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

  //@ Handle subscription upgrade (simulated)
  const handleSubscriptionAction = (tier: keyof typeof SUBSCRIPTION_TIERS) => {
    if (tier === "free") {
      toast({
        title: "Current Plan",
        description: "You are currently on the Free plan.",
        variant: "info"
      });
      return;
    }
    
    if (tier === "enterprise") {
      toast({
        title: "Contact Sales",
        description: "Our team will contact you shortly about Enterprise options.",
        variant: "hype"
      });
      return;
    }
    
    // For Pro tier, simulate redirect to checkout
    toast({
      title: "Redirecting to checkout",
      description: "You will be redirected to complete your subscription.",
      variant: "info"
    });
    
    // In production, this would redirect to a real checkout page
    setTimeout(() => {
      toast({
        title: "Subscription upgraded",
        description: "Welcome to TenderWatch Pro!",
        variant: "hype"
      });
      setCurrentTier("pro");
    }, 2000);
  };

  //@ Handle email notification changes using server action
  const handleEmailNotificationChange = async () => {
    setIsLoading(true);
    
    try {
      const result = await toggleEmailNotificationsAction();
      
      if (result.success) {
        setEmailNotifications(!emailNotifications);
        toast({
          title: "Settings updated",
          description: `Email notifications ${!emailNotifications ? "enabled" : "disabled"}.`,
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

  return (
    <div className="container mx-auto py-6 space-y-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <Tabs defaultValue="keywords">
        <TabsList className="mb-4">
          <TabsTrigger value="keywords">Saved Keywords</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
        
        {/* Saved Keywords Tab */}
        <TabsContent value="keywords">
          <Card>
            <CardHeader>
              <CardTitle>Saved Keywords</CardTitle>
              <CardDescription>
                Add keywords to receive updates when new tenders match your interests.
                {currentTier === "free" && " Free plan is limited to 5 keywords."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add new keyword */}
              <div className="flex gap-2">
                <Input 
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Add a new keyword"
                  className="flex-1"
                  disabled={isLoading || (currentTier === "free" && keywords.length >= 5)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddKeyword();
                  }}
                />
                <Button 
                  onClick={handleAddKeyword} 
                  disabled={isLoading || (currentTier === "free" && keywords.length >= 5)}
                >
                  Add
                </Button>
              </div>
              
              {/* Keywords list */}
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-3">Your keywords:</h3>
                {isLoading ? (
                  <div className="flex items-center justify-center h-20">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : keywords.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">No keywords added yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <Badge key={keyword.id} className="flex items-center gap-1 px-3 py-1">
                        <span>{keyword.text}</span>
                        <button 
                          onClick={() => handleRemoveKeyword(keyword.id, keyword.text)}
                          className="ml-1 text-xs rounded-full hover:bg-primary/20 p-1"
                          disabled={isLoading}
                        >
                          <MinusCircle className="h-3 w-3" />
                          <span className="sr-only">Remove {keyword.text}</span>
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Statistics about keywords */}
              <div className="bg-muted/50 p-4 rounded-md">
                <h3 className="font-medium mb-2">Keyword Statistics</h3>
                <ul className="text-sm space-y-1">
                  <li>Total keywords: {keywords.length}</li>
                  <li>
                    Keyword limit: {currentTier === "free" ? "5" : "Unlimited"}
                    {currentTier === "free" && keywords.length >= 5 && (
                      <span className="text-yellow-500 ml-2 font-medium">
                        (Limit reached)
                      </span>
                    )}
                  </li>
                  <li>Last month matches: 37</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Subscription Tab */}
        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plan</CardTitle>
              <CardDescription>
                Choose the subscription plan that fits your needs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => (
                  <Card key={key} className={cn(
                    "flex flex-col justify-between border",
                    currentTier === key && "border-primary shadow-sm"
                  )}>
                    <CardHeader>
                      <CardTitle>
                        {tier.name}
                        {currentTier === key && (
                          <Badge variant="outline" className="ml-2 font-normal">
                            Current
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        <span className="text-2xl font-bold">${tier.price}</span>
                        <span className="text-muted-foreground">/month</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <ul className="space-y-2 mb-6">
                        {tier.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <div className="p-6 pt-0">
                      <Button 
                        className="w-full" 
                        variant={currentTier === key ? "outline" : "default"}
                        onClick={() => handleSubscriptionAction(key as keyof typeof SUBSCRIPTION_TIERS)}
                        disabled={isLoading || (currentTier === key && key === "free")}
                      >
                        {currentTier === key ? tier.action : key === "enterprise" ? "Contact Sales" : "Upgrade"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you receive notifications about new tenders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium text-sm" id="email-notifications">Email Notifications</div>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email when new tenders match your keywords
                    </p>
                  </div>
                  <Switch 
                    id="email-notifications" 
                    checked={emailNotifications}
                    onCheckedChange={handleEmailNotificationChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Account Tab */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account details and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    {user?.imageUrl ? (
                      <div className="relative h-16 w-16 rounded-full overflow-hidden">
                        <Image 
                          src={user.imageUrl} 
                          alt={user.username || "You havent set a custom username yet"} 
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <Avatar className="h-16 w-16">
                        <AvatarFallback>
                          {user?.firstName?.charAt(0) || user?.username?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <h3 className="font-medium text-lg">
                        {user?.firstName} {user?.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {user?.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="font-medium text-sm">Username</div>
                      <Input 
                        id="username" 
                        value={user?.username || ""}
                        readOnly
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        Your username is managed by your authentication provider in {"`User > Manage account`"}.
                      </p>
                    </div>
                      
                    <div className="space-y-2">
                      <div className="font-medium text-sm">Email Address</div>
                      <Input 
                        id="email" 
                        type="email" 
                        value={user?.primaryEmailAddress?.emailAddress || ""}
                        readOnly
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        Your email is managed by your authentication provider.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 