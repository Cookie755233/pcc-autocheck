"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import type { Keyword } from '@prisma/client'
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Plus, X, Search, Eye, EyeOff } from "lucide-react";
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

  //@ Load user's keywords on mount
  useEffect(() => {
    async function loadKeywords() {
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
      } catch (error) {
        console.error('Error loading keywords:', error);
      }
    }

    loadKeywords();
  }, [user?.id]);

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newKeyword })
      });

      if (!response.ok) throw new Error('Failed to add keyword');
      
      const data = await response.json();
      setKeywords(prev => [...prev, data]);
      setActiveKeywords(prev => new Set([...prev, data.id]));
      setNewKeyword('');
      
      toast({
        title: "Keyword Added",
        description: `Added "${data.text}" to your keywords`,
        variant: "success",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error adding keyword:', error);
      toast({
        title: "Error",
        description: "Failed to add keyword. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
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
      
      setKeywords(prev => prev.filter(k => k.id !== id));
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
      console.log('Updated keyword from server:', updatedKeyword);
      
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
    const activeKeywordTexts = keywords
      .filter(k => activeKeywords.has(k.id))
      .map(k => k.text);
    
    // Initialize progress tracking
    setFetchProgress({
      current: 0,
      total: activeKeywordTexts.length
    });
    
    try {
      const response = await fetch('/api/tenders/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: activeKeywordTexts,
          dateRangeMonths
        })
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      const processChunk = async (chunk: string) => {
        const lines = chunk.split('\n\n').filter(Boolean);
        
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const jsonStr = line.slice(5).trim();
              const data = JSON.parse(jsonStr);
              
              // Update progress when we receive a progress update
              if (data.type === 'progress') {
                setFetchProgress({
                  current: data.current,
                  total: data.total
                });
                continue;
              }
              
              // Process tender data
              if (data.tender) {
                if (onTendersFound) {
                  onTendersFound([data]);
                }

                // Regular tender data
                console.log('📤 Dispatching tender event:', data.tender.id);
                const event = new TenderEvent(data);
                window.dispatchEvent(event);
              }
            } catch (e) {
              console.error('❌ Error parsing tender data:', e);
            }
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (buffer) {
            await processChunk(buffer);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        const lastNewlineIndex = buffer.lastIndexOf('\n\n');
        if (lastNewlineIndex > -1) {
          const completeChunks = buffer.slice(0, lastNewlineIndex);
          buffer = buffer.slice(lastNewlineIndex + 2);
          await processChunk(completeChunks);
        }
      }

      toast({
        title: "Search completed",
        description: "All tenders have been processed",
        variant: "success",
      });

    } catch (error) {
      console.error('Error fetching tenders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tenders. Please try again.",
        variant: "destructive",
        duration: 3000,
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
      });
      
      return newVisibility;
    });
  };

  return (
    <div className={cn(
      "p-4 border rounded-lg bg-white shadow-sm sticky top-4", 
      "h-[85vh] flex flex-col",
      className
    )}>
      <h2 className="text-lg font-semibold mb-4">Keywords</h2>
      
      {/* Keyword input form */}
      <form onSubmit={handleAddKeyword} className="flex gap-2 mb-4">
        <Input
          placeholder="Add a keyword..."
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !newKeyword.trim()}>
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
      
      {/* Keywords list - now with flex-1 to take available space */}
      <div className="space-y-2 mb-4 overflow-y-auto flex-1">
        {keywords.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No keywords added yet
          </div>
        ) : (
          keywords.map((keyword) => (
            <div 
              key={keyword.id}
              className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
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
                    "text-sm font-medium max-w-[170px] truncate",
                    !activeKeywords.has(keyword.id) && "text-muted-foreground"
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
                      ? "bg-[rgba(255,215,0,0.6)] text-primary hover:bg-[rgba(255,215,0,1)]"
                      : keywordVisibility.get(keyword.text) === KeywordVisibilityState.HIDDEN
                        ? "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                        : "hover:bg-[rgba(255,215,0,0.4)] hover:text-primary"
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
                  className="h-7 w-7 rounded-md transition-all hover:bg-destructive hover:text-destructive-foreground group"
                >
                  <X className="h-4 w-4 transition-transform group-hover:scale-110" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Separator line */}
      <Separator className="my-4" />
      
      {/* Date range filter and fetch button - now in a more compact layout */}
      <div className="mt-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Search within:</span>
          <Select
            value={dateRangeMonths.toString()}
            onValueChange={(value) => setDateRangeMonths(parseInt(value))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
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
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-in-out"
              style={{ 
                width: fetchProgress.total > 0 
                  ? `${(fetchProgress.current / fetchProgress.total) * 100}%` 
                  : '0%' 
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-center">
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
        </div>
      )}
    </div>
  );
} 