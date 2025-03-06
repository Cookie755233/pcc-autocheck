"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import type { Keyword } from '@prisma/client'
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Plus, X, Search, Eye, EyeOff, AlertCircle } from "lucide-react";
import { stringToColor } from "@/lib/utils";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TenderEvent } from "@/lib/events/tender-events";
import { TenderGroup } from "@/types/tender";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface KeywordPanelProps {
  className?: string;
  onTendersFound?: (tenders: any[]) => void;
}

// Add a new enum for keyword visibility states
enum KeywordVisibilityState {
  NORMAL = 'normal',   // Default - everything shown
  FOCUSED = 'focused', // Only show this keyword
  HIDDEN = 'hidden'    // Hide this keyword
}

export function KeywordPanel({ className, onTendersFound }: KeywordPanelProps) {
  const { user } = useUser();
  const [newKeyword, setNewKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 });
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [activeKeywords, setActiveKeywords] = useState<Set<string>>(new Set());
  const [dateRangeMonths, setDateRangeMonths] = useState<number>(6); // Default: 6 months
  const [hiddenKeywords, setHiddenKeywords] = useState<Set<string>>(new Set());
  const [keywordVisibility, setKeywordVisibility] = useState<Map<string, KeywordVisibilityState>>(
    new Map()
  );
  const [searchStats, setSearchStats] = useState({
    totalSearched: 0,
    inDateRange: 0,
    addedToBoard: 0
  });
  const [processingLog, setProcessingLog] = useState<string[]>([]);
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const [isProPlan, setIsProPlan] = useState(false);
  const [keywordLimitReached, setKeywordLimitReached] = useState(false);
  const FREE_TIER_KEYWORD_LIMIT = 5;

  const fetchKeywords = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch('/api/keywords');
      if (!response.ok) throw new Error('Failed to fetch keywords');
      const data = await response.json();
      
      console.log('Loaded keywords from API:', data);
      setKeywords(data);
      
      // Set active keywords based on isActive field from database
      const activeIds = data
        .filter((k: Keyword) => k.isActive === true)
        .map((k: Keyword) => k.id);
      
      console.log('Setting active keyword IDs:', activeIds);
      setActiveKeywords(new Set(activeIds));

      // Check if the keyword limit is reached for free tier
      setKeywordLimitReached(!isProPlan && data.length >= FREE_TIER_KEYWORD_LIMIT);
    } catch (error) {
      console.error('Error loading keywords:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchKeywords();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      // Fetch user's subscription status
      const fetchSubscriptionStatus = async () => {
        try {
          const response = await fetch('/api/users/subscription');
          if (!response.ok) throw new Error('Failed to fetch subscription');
          const data = await response.json();
          setIsProPlan(data.isProPlan || false);
          
          // Check if the keyword limit is reached for free tier users
          setKeywordLimitReached(!data.isProPlan && keywords.length >= FREE_TIER_KEYWORD_LIMIT);
        } catch (error) {
          console.error('Error fetching subscription status:', error);
          // Default to free tier if there's an error
          setIsProPlan(false);
          setKeywordLimitReached(keywords.length >= FREE_TIER_KEYWORD_LIMIT);
        }
      };
      
      fetchSubscriptionStatus();
    }
  }, [user?.id, keywords.length]);

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim() || keywordLimitReached) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newKeyword })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === 'Free tier limited to 5 keywords') {
          setKeywordLimitReached(true);
          toast({
            title: "Keyword Limit Reached",
            description: "Free tier is limited to 5 keywords. Upgrade to Pro for unlimited keywords.",
            variant: "warning",
            duration: 5000,
          });
          throw new Error(errorData.error);
        }
        throw new Error('Failed to add keyword');
      }
      
      const data = await response.json();
      setKeywords(prev => [...prev, data]);
      setActiveKeywords(prev => new Set([...prev, data.id]));
      setNewKeyword('');
      
      // Check if we've reached the keyword limit after adding
      if (!isProPlan && keywords.length + 1 >= FREE_TIER_KEYWORD_LIMIT) {
        setKeywordLimitReached(true);
      }
      
      toast({
        title: "Keyword Added",
        description: `Added "${data.text}" to your keywords`,
        variant: "success",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error adding keyword:', error);
      if (!(error instanceof Error && error.message === 'Free tier limited to 5 keywords')) {
        toast({
          title: "Error",
          description: "Failed to add keyword. Please try again.",
          variant: "destructive",
          duration: 3000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteKeyword = async (id: string) => {
    try {
      const keywordToDelete = keywords.find(k => k.id === id);
      const response = await fetch(`/api/keywords/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete keyword');
      
      setKeywords(prev => {
        const newKeywords = prev.filter(k => k.id !== id);
        // Update keyword limit reached status
        if (!isProPlan && newKeywords.length < FREE_TIER_KEYWORD_LIMIT) {
          setKeywordLimitReached(false);
        }
        return newKeywords;
      });
      setActiveKeywords(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      
      toast({
        title: "Keyword Deleted",
        description: `Removed "${keywordToDelete?.text}" from your keywords`,
        variant: "warning",
        duration: 3000,
      });
      
      // Dispatch event for TenderBoard to handle archiving tenders
      if (keywordToDelete) {
        // Fire a custom event to notify TenderBoard
        const event = new CustomEvent('keywordDeleted', {
          detail: {
            keyword: id,
            text: keywordToDelete.text
          }
        });
        window.dispatchEvent(event);
        console.log(`Dispatched keywordDeleted event for "${keywordToDelete.text}"`);
      }
    } catch (error) {
      console.error('Error deleting keyword:', error);
      toast({
        title: "Error",
        description: "Failed to delete keyword. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const toggleKeyword = async (keywordId: string) => {
    // Find the keyword
    const keyword = keywords.find(k => k.id === keywordId);
    if (!keyword) {
      console.error('Keyword not found:', keywordId);
      return;
    }
    
    // Toggle active state locally first for responsive UI
    const newActiveState = !activeKeywords.has(keywordId);
    console.log(`Toggling keyword ${keywordId} to ${newActiveState}`);
    
    // Update local state immediately for better UX
    setActiveKeywords(prev => {
      const next = new Set(prev);
      if (newActiveState) {
        next.add(keywordId);
      } else {
        next.delete(keywordId);
      }
      return next;
    });
    
    // Update the keyword in the database
    try {
      console.log(`Sending PATCH request to /api/keywords/${keywordId} with isActive=${newActiveState}`);
      
      const response = await fetch(`/api/keywords/${keywordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newActiveState })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', response.status, errorText);
        throw new Error('Failed to update keyword active state');
      }
      
      const updatedKeyword = await response.json();
      // console.log('Updated keyword from server:', updatedKeyword);
      
      // Update the keyword in the local state
      setKeywords(prev => 
        prev.map(k => 
          k.id === keywordId 
            ? { ...k, isActive: newActiveState } 
            : k
        )
      );
    } catch (error) {
      console.error('Failed to update keyword active state:', error);
      
      // Revert the local state if the API call fails
      setActiveKeywords(prev => {
        const next = new Set(prev);
        if (!newActiveState) {
          next.add(keywordId);
        } else {
          next.delete(keywordId);
        }
        return next;
      });
      
      toast({
        title: "Error",
        description: "Failed to update keyword status",
        variant: "destructive",
      });
    }
  };

  const handleFetch = async () => {
    setIsFetching(true);
    // Reset stats at start of search
    setSearchStats({
      totalSearched: 0,
      inDateRange: 0,
      addedToBoard: 0
    });
    setProcessingLog([]); // Clear previous logs

    try {
      const activeKeywordTexts = keywords
        .filter(k => activeKeywords.has(k.id))
        .map(k => k.text);

      if (activeKeywordTexts.length === 0) {
        toast({
          title: "No active keywords",
          description: "Please activate at least one keyword to search.",
          variant: "warning"
        });
        return;
      }

      const response = await fetch('/api/tenders/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: activeKeywordTexts,
          dateRangeMonths
        })
      });

      if (!response.ok) throw new Error('Search request failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';
      let processedTenders = new Set(); // Track processed tenders to avoid duplicates

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.slice(5));
              console.log("📥 Received data:", data);

              if (data.type === 'progress') {
                setFetchProgress({
                  current: data.current,
                  total: data.total
                });
                
                // Add log entry if log message is provided
                if (data.log) {
                  setProcessingLog(prev => {
                    const newLogs = [...prev, data.log];
                    // Keep only the last 100 logs to prevent memory issues
                    return newLogs.slice(-100);
                  });
                }
              } 
              else if (data.type === 'complete') {
                console.log("🏁 Search complete:", data);
                setSearchStats(prev => ({
                  ...prev,
                  totalSearched: data.totalFound || 0,
                  inDateRange: data.processedCount || 0
                }));

                // Show completion toast only after we have final stats
                if (data.totalFound > 0 && data.processedCount === 0) {
                  toast({
                    title: "No Matching Tenders",
                    description: `Found ${data.totalFound} tenders but none were within the specified date range.`,
                    variant: "warning",
                  });
                } else if (data.totalFound > 0) {
                  toast({
                    title: "Search Complete",
                    description: (
                      <div className="space-y-1">
                        <p>Total tenders searched: {data.totalFound}</p>
                        <p>Tenders in date range: {data.processedCount}</p>
                        <p>New tenders added: {processedTenders.size}</p>
                      </div>
                    ),
                    variant: processedTenders.size > 0 ? "success" : "info",
                  });
                }
              }
              else if (data.tender) { // It's a tender
                console.log("🎯 Processing tender:", data);
                
                // Add to processing log
                setProcessingLog(prev => {
                  const tenderId = data.tender.id || "unknown";
                  const title = data.tender.title || "Unnamed tender";
                  
                  // We no longer need to add logs here as they now come directly from the server
                  // with detailed status information
                  
                  const newLogs = [...prev];
                  return newLogs.slice(-100);
                });
                
                // First notify parent component
                if (onTendersFound) {
                  onTendersFound([data]);
                }

                // Then dispatch event for other components
                const event = new CustomEvent('tenderFound', { 
                  detail: {
                    ...data,
                    tender: {
                      ...data.tender,
                    },
                    isNew: data.isNew,
                    hasNewVersions: data.hasNewVersions
                  }
                });
                window.dispatchEvent(event);

                // Update stats
                setSearchStats(prev => ({
                  ...prev,
                  addedToBoard: prev.addedToBoard + 1
                }));
              }
            } catch (error) {
              console.error('❌ Error processing data:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching tenders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tenders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const toggleKeywordVisibility = (keyword: string) => {
    setKeywordVisibility(prev => {
      const newVisibility = new Map(prev);
      const currentState = prev.get(keyword) || KeywordVisibilityState.NORMAL;
      
      // Cycle through states: NORMAL -> FOCUSED -> HIDDEN -> NORMAL
      let newState: KeywordVisibilityState;
      if (currentState === KeywordVisibilityState.NORMAL) {
        newState = KeywordVisibilityState.FOCUSED;
      } else if (currentState === KeywordVisibilityState.FOCUSED) {
        newState = KeywordVisibilityState.HIDDEN;
      } else {
        newState = KeywordVisibilityState.NORMAL;
      }
      
      newVisibility.set(keyword, newState);
      
      // Dispatch event for the board with the appropriate action
      const event = new CustomEvent('toggleKeywordVisibility', {
        detail: { 
          keyword,
          state: newState
        }
      });
      window.dispatchEvent(event);
      
      // Show appropriate toast with correct messages
      let toastTitle, toastDescription;
      if (newState === KeywordVisibilityState.FOCUSED) {
        toastTitle = "Keyword Focused";
        toastDescription = `Filtering "${keyword}"`;
      } else if (newState === KeywordVisibilityState.HIDDEN) {
        toastTitle = "Keyword Hidden";
        toastDescription = `Excluding "${keyword}"`;
      } else {
        toastTitle = "Filter Cleared";
        toastDescription = `"${keyword}" filter removed`;
      }
      
      toast({
        title: toastTitle,
        description: toastDescription,
        duration: 2000,
        variant: "info",
      });
      
      return newVisibility;
    });
  };

  const handleCloseAllKeywords = async () => {
    // Show confirmation dialog
    if (!confirm("Are you sure you want to deactivate all keywords?")) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Update each active keyword to inactive
      const promises = keywords
        .filter(k => k.isActive)
        .map(keyword => 
          fetch(`/api/keywords/${keyword.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ isActive: false }),
          })
        );
      
      await Promise.all(promises);
      
      // Refresh the keywords list
      await fetchKeywords();
      
      toast({
        title: "Keywords deactivated",
        description: "All keywords have been deactivated successfully.",
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to deactivate keywords:", error);
      toast({
        title: "Error",
        description: "Failed to deactivate keywords. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateAllKeywords = async () => {
    // Show confirmation dialog
    if (!confirm("Are you sure you want to activate all keywords?")) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Update each inactive keyword to active
      const promises = keywords
        .filter(k => !k.isActive)
        .map(keyword => 
          fetch(`/api/keywords/${keyword.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ isActive: true }),
          })
        );
      
      await Promise.all(promises);
      
      // Refresh the keywords list
      await fetchKeywords();
      
      toast({
        title: "Keywords activated",
        description: "All keywords have been activated successfully.",
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to activate keywords:", error);
      toast({
        title: "Error",
        description: "Failed to activate keywords. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn(
      "p-4 border rounded-lg",
      "h-[87vh] flex flex-col",
      "bg-white shadow-sm",
      "dark:bg-gray-900/50 dark:border-gray-800 dark:shadow-[0_2px_10px_rgba(255,255,255,0.05)]",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Keywords</h2>
        {keywords.length > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={keywords.every(k => k.isActive) 
              ? handleCloseAllKeywords 
              : handleActivateAllKeywords}
            disabled={isLoading}
            className="dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {keywords.every(k => k.isActive) 
              ? "Deactivate All" 
              : "Activate All"}
          </Button>
        )}
      </div>
      
      {/* Keyword input form */}
      <form onSubmit={handleAddKeyword} className="flex gap-2 mb-4">
        <Input
          placeholder={keywordLimitReached 
            ? "Keyword limit reached" 
            : "Add a keyword..."}
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          className={cn(
            "flex-1 dark:bg-gray-800 dark:border-gray-700",
            keywordLimitReached && "opacity-60"
          )}
          disabled={isLoading || keywordLimitReached}
        />
        <Button 
          type="submit" 
          disabled={isLoading || !newKeyword.trim() || keywordLimitReached}
        >
          {isLoading ? (
            <span className="flex items-center gap-1">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Adding...</span>
            </span>
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </form>
      
      {/* Keyword limit warning */}
      {keywordLimitReached && (
        <Alert variant="destructive" className="mb-4 py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Free tier is limited to {FREE_TIER_KEYWORD_LIMIT} keywords. <a href="/dashboard/settings" className="underline font-medium text-blue-500 hover:text-blue-700">Upgrade to Pro</a> for unlimited keywords.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Keywords list - now with flex-1 to take available space */}
      <div className="space-y-2 mb-4 overflow-y-auto flex-1">
        {keywords.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4 dark:text-gray-400">
            No keywords added yet
          </div>
        ) : (
          keywords.map((keyword) => (
            <div 
              key={keyword.id}
              className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors dark:bg-gray-600/50 dark:hover:bg-gray-800"
              style={{ 
                borderLeft: `4px solid ${stringToColor(keyword.text, 1, true)}` 
              }}
            >
              <div className="flex items-center gap-2">
                <Switch
                  checked={activeKeywords.has(keyword.id)}
                  onCheckedChange={() => toggleKeyword(keyword.id)}
                />
                <span
                  className={cn(
                    "text-sm font-medium w-[140px] truncate",
                    !activeKeywords.has(keyword.id) && "text-muted-foreground dark:text-gray-400"
                  )}
                >
                  {keyword.text}
                </span>
              </div>
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleKeywordVisibility(keyword.text)}
                  className={cn(
                    "h-7 w-7 rounded-md transition-all group mr-1 relative",
                    keywordVisibility.get(keyword.text) === KeywordVisibilityState.FOCUSED 
                      ? "bg-[rgba(255,215,0,0.6)] text-primary hover:bg-[rgba(255,215,0,1)] dark:bg-[rgba(255,215,0,0.3)] dark:text-yellow-300"
                      : keywordVisibility.get(keyword.text) === KeywordVisibilityState.HIDDEN
                        ? "bg-muted/30 text-muted-foreground hover:bg-muted/50 dark:bg-gray-700/50 dark:hover:bg-gray-700"
                        : "hover:bg-[rgba(255,215,0,0.4)] hover:text-primary dark:hover:bg-[rgba(255,215,0,0.2)]"
                  )}
                  title={
                    keywordVisibility.get(keyword.text) === KeywordVisibilityState.FOCUSED
                      ? "Only showing this keyword"
                      : keywordVisibility.get(keyword.text) === KeywordVisibilityState.HIDDEN
                        ? "Hiding this keyword"
                        : "Click to filter"
                  }
                >
                  {/* Eye icon - always present but with different opacity */}
                  <Eye 
                    className={cn(
                      "h-4 w-4 absolute inset-0 m-auto transition-all duration-300",
                      keywordVisibility.get(keyword.text) === KeywordVisibilityState.HIDDEN
                        ? "opacity-0 scale-75 rotate-90"
                        : keywordVisibility.get(keyword.text) === KeywordVisibilityState.FOCUSED
                          ? "opacity-100 scale-100 rotate-0 animate-[scale_0.8s_ease-out]"
                          : "opacity-100 scale-100 rotate-0",
                      keywordVisibility.get(keyword.text) === KeywordVisibilityState.FOCUSED && 
                        "text-primary drop-shadow-[0_0_3px_rgba(255,215,0,0.6)]"
                    )} 
                  />
                  
                  {/* EyeOff icon - always present but with different opacity */}
                  <EyeOff 
                    className={cn(
                      "h-4 w-4 absolute inset-0 m-auto transition-all duration-300",
                      keywordVisibility.get(keyword.text) === KeywordVisibilityState.HIDDEN
                        ? "opacity-100 scale-100 rotate-0"
                        : "opacity-0 scale-75 rotate-90"
                    )} 
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteKeyword(keyword.id)}
                  className="h-7 w-7 rounded-md transition-all hover:bg-destructive hover:text-destructive-foreground group dark:hover:bg-destructive/70"
                >
                  <X className="h-4 w-4 transition-transform group-hover:scale-110" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Separator line */}
      <Separator className="my-4 dark:bg-gray-700" />
      
      {/* Date range filter and fetch button - now in a more compact layout */}
      <div className="mt-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium dark:text-gray-300">Search within:</span>
          <Select
            value={dateRangeMonths.toString()}
            onValueChange={(value) => setDateRangeMonths(parseInt(value))}
          >
            <SelectTrigger className="w-[120px] dark:bg-gray-800 dark:border-gray-700">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              <SelectItem value="1">1 month</SelectItem>
              <SelectItem value="3">3 months</SelectItem>
              <SelectItem value="6">6 months</SelectItem>
              <SelectItem value="12">1 year</SelectItem>
              <SelectItem value="24">2 years</SelectItem>
              <SelectItem value="999">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button
          onClick={handleFetch}
          disabled={isFetching || activeKeywords.size === 0}
          className="w-full"
          variant="default"
        >
          {isFetching ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              <span>Fetching tenders...</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              <span>Fetch New Tenders</span>
            </>
          )}
        </Button>
      </div>

      {isFetching && (
        <div className="mt-2">
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden dark:bg-gray-700">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-in-out"
              style={{ 
                width: fetchProgress.total > 0 
                  ? `${(fetchProgress.current / fetchProgress.total) * 100}%` 
                  : '0%' 
              }}
            />
          </div>
          <div className="mt-1 text-xs text-muted-foreground dark:text-gray-400 flex flex-col">
            <div className="flex justify-between items-center">
              <p>
                {fetchProgress.current > 0 
                  ? (() => {
                      // Get array of active keyword IDs
                      const activeKeywordIds = Array.from(activeKeywords);
                      // Get the current keyword ID (adjusting for 0-based index)
                      const currentKeywordId = activeKeywordIds[fetchProgress.current - 1];
                      // Find the keyword text
                      const currentKeyword = keywords.find(k => k.id === currentKeywordId)?.text || '';
                      return `🔍 "${currentKeyword}" (${fetchProgress.current}/${fetchProgress.total})`;
                    })()
                  : 'Preparing search...'}
              </p>
              
              {/* Toggle for log display */}
              {processingLog.length > 0 && (
                <button 
                  className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  onClick={() => setIsLogExpanded(prev => !prev)}
                  type="button"
                >
                  {isLogExpanded ? 'Hide details' : 'Show details'}
                </button>
              )}
            </div>
            
            {/* Scrollable log area */}
            {isLogExpanded && processingLog.length > 0 && (
              <div className="mt-2 border rounded p-2 bg-black/5 dark:bg-white/5 h-24 overflow-y-auto text-[10px] font-mono">
                {processingLog.map((log, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "whitespace-pre-wrap break-all mb-0.5",
                      log.startsWith('🆕') && "text-green-600 dark:text-green-400 font-medium",
                      log.startsWith('✅') && "text-green-500 dark:text-green-400",
                      log.startsWith('📝') && "text-blue-600 dark:text-blue-400",
                      log.startsWith('ℹ️') && "text-gray-600 dark:text-gray-400",
                      log.startsWith('📋') && "text-gray-500 dark:text-gray-500",
                      log.startsWith('⚠️') && "text-amber-600 dark:text-amber-400",
                      log.startsWith('❌') && "text-red-600 dark:text-red-400"
                    )}
                  >
                    {log}
                  </div>
                ))}
                <div ref={el => {
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                }} />
              </div>
            )}
            
            {/* Stats summary */}
            {searchStats.addedToBoard > 0 && (
              <p className="text-green-600 dark:text-green-400 mt-0.5 text-center text-[11px]">
                Found {searchStats.addedToBoard} tenders matching the search conditions
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 