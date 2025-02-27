"use client"

import { cn } from "@/lib/utils"
import { Archive, Filter, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useMemo, useCallback } from "react"
import { TenderCard } from "@/components/dashboard/tender-card"
import { Tender, TenderGroup } from "@/types/tender"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"
import { TenderFilters } from "./tender-filters"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { motion, AnimatePresence } from "framer-motion"
import { useUser } from "@clerk/nextjs"
import { toast } from "@/components/ui/use-toast"
import { useToast } from "@/components/ui/use-toast"
import { TenderEvent } from "@/lib/events/tender-events"

// Add the KeywordVisibilityState enum at the top of the file
enum KeywordVisibilityState {
  NORMAL = 'normal',   // Default - everything shown
  FOCUSED = 'focused', // Only show this keyword
  HIDDEN = 'hidden'    // Hide this keyword
}

interface TenderBoardProps {
  className?: string
  initialTenders?: TenderGroup[]
  onArchive?: (tender: Tender) => void
}

//@ Fetches user's tender views from the database
async function fetchUserTenderViews(userId: string) {
  try {
    const response = await fetch(`/api/tenders/views?userId=${userId}`)
    if (!response.ok) throw new Error('Failed to fetch tender views')
    return await response.json()
  } catch (error) {
    console.error('Error fetching tender views:', error)
    return []
  }
}

export function TenderBoard({ className, initialTenders = [], onArchive }: TenderBoardProps) {
  const { user } = useUser()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'inbox' | 'archived'>('inbox')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  // Format initial tenders to match the expected structure
  const formattedInitialTenders = useMemo(() => {
    return initialTenders.map(group => ({
      tender: {
        ...group.tender,
        title: group.tender.title || group.versions?.[0]?.data?.brief?.title || 'No title',
        date: group.tender.date || Number(group.versions?.[0]?.date) || Date.now(),
        brief: group.tender.brief || group.versions?.[0]?.data?.brief || {}
      },
      versions: group.versions?.map(v => ({
        ...v,
        data: {
          ...v.data,
          brief: v.data?.brief || {}
        }
      })) || [],
      relatedTenders: group.relatedTenders || []
    }));
  }, [initialTenders]);
  
  const [localTenders, setLocalTenders] = useState<TenderGroup[]>(formattedInitialTenders)
  const [processedTenders, setProcessedTenders] = useState(0)
  const [isScrollingUp, setIsScrollingUp] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    tags: [] as string[],
    types: [] as string[],
    organizations: [] as string[],
    dateRange: [0, 0] as [number, number],
    sortDirection: 'desc' as 'asc' | 'desc',
    includeTags: [] as string[],
    excludeTags: [] as string[]
  })
  
  // Get date range
  const dateRange = useMemo(() => {
    if (!localTenders?.length) return [0, 0] as [number, number];
    
    // Extract dates, filtering out undefined values
    const dates = localTenders.flatMap(g => [
      g.tender,
      ...(Array.isArray(g.relatedTenders) ? g.relatedTenders : [])
    ])
    .map(t => t.date)
    .filter(date => date !== undefined && !isNaN(date));
    
    // If no valid dates, return default range
    if (dates.length === 0) return [0, 0] as [number, number];
    
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    
    // Ensure we return valid numbers
    return [
      !isNaN(min) ? min : 0,
      !isNaN(max) ? max : 0
    ] as [number, number];
  }, [localTenders])
  
  // Initialize filters with the calculated date range
  useEffect(() => {
    if (dateRange[0] !== 0 || dateRange[1] !== 0) {
      setFilters(prev => ({
        ...prev,
        dateRange
      }));
    }
  }, [dateRange]);
  
  // Get all unique tags
  const allTags = useMemo(() => {
    if (!localTenders?.length) return []
    return Array.from(new Set(localTenders.flatMap(g => 
      [g.tender, ...(g.relatedTenders || [])]
        .map(t => t.keyword)
        .filter((t): t is string => t !== undefined)
    )))
  }, [localTenders])
  
  // Get all unique types
  const allTypes = useMemo(() => {
    if (!localTenders?.length) return []
    return Array.from(new Set(localTenders.flatMap(g => 
      [g.tender, ...(g.relatedTenders || [])]
        .map(t => t.brief?.type)
        .filter((t): t is string => t !== undefined)
    )))
  }, [localTenders])

  // Use a memoized fetch function to prevent unnecessary re-renders
  const fetchTenders = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      console.log(`Fetching tender views for user: ${user.id}`);
      
      const response = await fetch(`/api/tenders/views?userId=${user.id}`);
      if (!response.ok) throw new Error("Failed to fetch tenders");
      
      const data = await response.json();
      console.log(`Found tender views: ${data.length}`);
      setLocalTenders(data);
    } catch (error) {
      console.error("Error fetching tenders:", error);
      toast({
        title: "Error",
        description: "Failed to load tenders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  // Fetch tenders only once when the component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      fetchTenders();
    }
  }, [user?.id, fetchTenders]);
  
  // Separate effect for toast notifications
  useEffect(() => {
    if (processedTenders > 0) {
      const lastTender = localTenders[0];
      if (lastTender) {
        toast({
          title: "New Tender Found",
          description: `${lastTender.tender.title}`,
          variant: "info",
          duration: 3000,
        });
      }
    }
  }, [localTenders, processedTenders, toast]);

  useEffect(() => {
    const handleNewTender = (event: TenderEvent) => {
      const newTender = event.detail;
      console.log('📥 Received new tender data:', {
        id: newTender.tender.id,
        versions: newTender.versions?.length,
        firstVersion: newTender.versions?.[0]
      });
      
      setLocalTenders(prev => {
        const exists = prev.some(t => t.tender.id === newTender.tender.id);
        if (exists) {
          console.log('⚠️ Tender already exists:', newTender.tender.id);
          return prev;
        }
        
        // Construct proper tender object
        const tenderGroup = {
          tender: {
            ...newTender.tender,
            id: newTender.tender.id,
            date: Number(newTender.versions[0]?.date || Date.now()),
            title: newTender.versions[0]?.data?.brief?.title || 'No title',
            unit_id: newTender.tender.id.split('unit_id=')[1]?.split('&')[0],
            job_number: newTender.tender.id.split('job_number=')[1],
            isArchived: false,
            isHighlighted: false,
            brief: newTender.versions[0]?.data?.brief || {} // Add brief data
          },
          versions: newTender.versions.map(v => ({
            ...v,
            data: {
              ...v.data,
              brief: v.data?.brief || {}
            }
          })),
          relatedTenders: []
        };

        console.log('✅ Adding new tender to board:', tenderGroup);
        setProcessedTenders(count => count + 1);
        return [tenderGroup, ...prev];
      });
    };

    const handleSearchComplete = (event: CustomEvent) => {
      toast({
        title: "Search Complete",
        description: `Found ${processedTenders} new tenders`,
        variant: "success",
        duration: 3000,
      });
      setProcessedTenders(0); // Reset counter
    };

    console.log('🎯 Setting up tender event listeners');
    window.addEventListener('newTenderFound', handleNewTender);
    window.addEventListener('searchComplete', handleSearchComplete);
    
    return () => {
      console.log('🧹 Cleaning up tender event listeners');
      window.removeEventListener('newTenderFound', handleNewTender);
      window.removeEventListener('searchComplete', handleSearchComplete);
    };
  }, []);

  // Fix the boardFilteredTenders function to work with filteredTenders
  const boardFilteredTenders = useMemo(() => {
    if (!localTenders) return [];
    
    return localTenders.filter(group => {
      // Check both isArchived and archived flags for consistency
      const isArchived = group.tender.isArchived === true || group.tender.archived === true;
      
      if (activeTab === 'inbox') {
        return !isArchived;
      } else {
        return isArchived;
      }
    });
  }, [localTenders, activeTab]);

  // Update the counts to use the same logic
  const inboxCount = useMemo(() => {
    return localTenders.filter(group => 
      !(group.tender.isArchived === true || group.tender.archived === true)
    ).length;
  }, [localTenders]);

  const archivedCount = useMemo(() => {
    return localTenders.filter(group => 
      group.tender.isArchived === true || group.tender.archived === true
    ).length;
  }, [localTenders]);

  // Fix the filteredTenders function to use boardFilteredTenders
  const filteredTenders = useMemo(() => {
    if (!boardFilteredTenders) {
      console.log('No board filtered tenders available');
      return [];
    }
    
    console.log(`Starting filtering with ${boardFilteredTenders.length} tenders`);
    console.log('Current filters:', filters);
    
    const result = boardFilteredTenders.filter(group => {
      const tender = group.tender;
      const versions = group.versions || [];
      
      // Filter by include tags (show ONLY these tags)
      if (filters.includeTags && filters.includeTags.length > 0) {
        const tenderTags = Array.isArray(tender?.tags) ? tender.tags : [];
        if (!tenderTags.some(tag => filters.includeTags.includes(tag))) {
          return false;
        }
      }
      
      // Filter by exclude tags (hide these tags)
      if (filters.excludeTags && filters.excludeTags.length > 0) {
        const tenderTags = Array.isArray(tender?.tags) ? tender.tags : [];
        if (tenderTags.some(tag => filters.excludeTags.includes(tag))) {
          return false;
        }
      }
      
      // Filter by organizations with detailed logging
      if (filters.organizations.length > 0) {
        // Get organization from all possible locations
        const orgs = [];
        
        // Check main tender
        if (tender?.unit_name) {
          orgs.push(tender.unit_name);
        }
        
        // Check all versions
        versions.forEach(v => {
          // Check all possible locations for unit_name
          const versionOrg = v.data?.unit_name || 
                             v.enrichedData?.unit_name || 
                             v.data?.detail?.["機關資料:機關名稱"] || 
                             v.data?.detail?.["機關資料:單位名稱"];
          
          if (versionOrg) {
            orgs.push(versionOrg);
          }
        });
        
        // Log the organizations found for this tender
        // console.log(`Tender ${tender.id} organizations:`, orgs);
        // console.log(`Selected organizations:`, filters.organizations);
        
        // Check if any selected organization is in the tender organizations
        const matchesOrg = orgs.some(org => filters.organizations.includes(org));
        console.log(`Tender ${tender.id} matches organization filter: ${matchesOrg}`);
        
        if (!matchesOrg) {
          return false;
        }
      }
      
      // Filter by types
      if (filters.types.length > 0) {
        if (!tender?.brief?.type || !filters.types.includes(tender.brief.type)) {
          return false;
        }
      }
      
      // Date range filter
      if (filters.dateRange && filters.dateRange.length === 2) {
        try {
          // Parse tender date correctly from YYYYMMDD format
          const dateStr = tender.date.toString();
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6)) - 1; // Months are 0-indexed in JS
          const day = parseInt(dateStr.substring(6, 8));
          
          const tenderDate = new Date(year, month, day);
          
          // Parse start and end dates
          const startDateStr = filters.dateRange[0].toString();
          const startYear = parseInt(startDateStr.substring(0, 4));
          const startMonth = parseInt(startDateStr.substring(4, 6)) - 1;
          const startDay = parseInt(startDateStr.substring(6, 8));
          
          const endDateStr = filters.dateRange[1].toString();
          const endYear = parseInt(endDateStr.substring(0, 4));
          const endMonth = parseInt(endDateStr.substring(4, 6)) - 1;
          const endDay = parseInt(endDateStr.substring(6, 8));
          
          const startDate = new Date(startYear, startMonth, startDay);
          const endDate = new Date(endYear, endMonth, endDay);
          
          // Add one day to end date to include the end date in the range
          endDate.setDate(endDate.getDate() + 1);
          
          // Log the date values for debugging
          // console.log(`Date check for tender ${tender.id}:`, {
          //   tenderDate,
          //   startDate,
          //   endDate,
          //   tenderDateStr: tender.date,
          //   startDateStr: filters.dateRange[0],
          //   endDateStr: filters.dateRange[1],
          //   isInRange: tenderDate >= startDate && tenderDate <= endDate
          // });
          
          if (tenderDate < startDate || tenderDate > endDate) {
            return false;
          }
        } catch (error) {
          console.error(`Error in date filter for tender ${tender.id}:`, error);
          // Don't filter out if there's an error
          return true;
        }
      }
      
      return true;
    });
    
    console.log(`Filtering complete. ${result.length} tenders match the filters.`);
    return result;
  }, [boardFilteredTenders, filters]);

  // Group tenders by date (year and month)
  const groupedTenders = useMemo(() => {
    if (!filteredTenders) return [];
    
    const groups: { date: string; tenders: TenderGroup[] }[] = [];
    const dateMap = new Map<string, TenderGroup[]>();
    
    filteredTenders.forEach(group => {
      // Extract date from tender
      const tenderDate = group.tender.date;
      if (!tenderDate) return;
      
      // Convert YYYYMMDD to Date object
      const dateStr = tenderDate.toString();
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      
      // Create a date string for grouping (YYYY-MM)
      const dateKey = `${year}-${month}-01`;
      
      // Add to map
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)?.push(group);
    });
    
    // Convert map to array and sort by date
    dateMap.forEach((tenders, dateKey) => {
      groups.push({
        date: dateKey,
        tenders
      });
    });
    
    // Sort groups by date (newest first if desc, oldest first if asc)
    return groups.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [filteredTenders, sortDirection]);

  // Handle archive/unarchive
  const handleArchive = async (tenderId: string, isArchived: boolean) => {
    if (!user?.id) return;
    
    try {
      // Optimistically update UI first for immediate feedback
      setLocalTenders(prev => 
        prev.map(group => 
          group.tender.id === tenderId 
            ? { ...group, tender: { ...group.tender, isArchived, archived: isArchived } } 
            : group
        )
      );
      
      // Then send the request to the server
      const response = await fetch('/api/tenders/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenderId,
          isArchived,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update archive status');
      }
      
      // No need to update state again since we already did it optimistically
      toast({
        title: isArchived ? "Tender Archived" : "Tender Restored",
        description: "The tender has been " + (isArchived ? "moved to archive" : "restored to inbox"),
        variant: "info",
      });
    } catch (error) {
      console.error('Error archiving tender:', error);
      
      // Revert the optimistic update if there was an error
      setLocalTenders(prev => 
        prev.map(group => 
          group.tender.id === tenderId 
            ? { ...group, tender: { ...group.tender, isArchived: !isArchived, archived: !isArchived } } 
            : group
        )
      );
      
      toast({
        title: "Error",
        description: "Failed to update tender status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle highlight
  const handleHighlight = async (tenderId: string, isHighlighted: boolean) => {
    if (!user?.id) return;
    
    try {
      // Optimistically update UI
      setLocalTenders(prev => 
        prev.map(group => 
          group.tender.id === tenderId 
            ? { 
                ...group, 
                tender: { 
                  ...group.tender, 
                  isHighlighted 
                } 
              } 
            : group
        )
      );
      
      // Send API request
      const response = await fetch('/api/tenders/highlight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenderId,
          userId: user.id,
          isHighlighted
        }),
      });
      
      toast({
        title: isHighlighted ? "Tender Highlighted" : "Tender Unhighlighted",
        description: "The tender has been " + (isHighlighted ? "highlighted" : "unhighlighted"),
        variant: "info",
      });
      
      if (!response.ok) {
        throw new Error('Failed to update highlight status');
      }

      // No need to refetch - we already updated the UI
    } catch (error) {
      console.error('Error updating highlight status:', error);
      // Revert the change if there was an error
      fetchTenders();

      toast({
        title: "Error",
        description: "Failed to update highlight status. Please try again.",
        variant: "destructive",
      });
    }


  };

  // Handle filter change
  const handleFilterChange = ({
    tags,
    types,
    organizations,
    dateRange,
    sortDirection
  }: {
    tags: string[]
    types: string[]
    organizations: string[]
    dateRange: [number, number]
    sortDirection: 'asc' | 'desc'
  }) => {
    setFilters({
      tags,
      types,
      organizations,
      dateRange,
      sortDirection
    });
    setSortDirection(sortDirection);
  };

  // Create a summary of active filters
  const activeFiltersText = useMemo(() => {
    const parts: string[] = []
    if (filters.tags.length > 0) {
      parts.push(`tags: ${filters.tags.join(', ')}`)
    }
    if (filters.organizations.length > 0) {
      parts.push(`bureau: ${filters.organizations.join(', ')}`)
    }
    if (filters.types.length > 0) {
      parts.push(`types: ${filters.types.join(', ')}`)
    }
  
    // Add date range if it's not the default range
    if (filters.dateRange[0] !== 0 && filters.dateRange[1] !== 0 && 
        (filters.dateRange[0] !== dateRange[0] || filters.dateRange[1] !== dateRange[1])) {
      // Format dates from YYYYMMDD to YYYY/MM/DD
      const formatDateNum = (dateNum: number) => {
        const dateStr = dateNum.toString();
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        return `${year}/${month}/${day}`;
      };
      
      parts.push(`date: ${formatDateNum(filters.dateRange[0])} - ${formatDateNum(filters.dateRange[1])}`);
    }
    
    return parts.length > 0 ? parts.join(' | ') : '';
  }, [filters.tags, filters.organizations, filters.types, filters.dateRange, dateRange]);

  // Handle scroll for floating filters
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      setIsScrollingUp(currentScrollY < lastScrollY && currentScrollY > 100)
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Add logging to the render section
  useEffect(() => {
    console.log(`Render: ${filteredTenders.length} tenders after filtering`);
    console.log('First few filtered tenders:', filteredTenders.slice(0, 3));
  }, [filteredTenders]);

  // Fix the useEffect to handle keyword visibility toggling correctly
  useEffect(() => {
    const handleToggleKeywordVisibility = (event: CustomEvent) => {
      const keyword = event.detail.keyword;
      const state = event.detail.state;
      
      setFilters(prevFilters => {
        // Create copies of the arrays
        let includeTags = [...prevFilters.includeTags || []];
        let excludeTags = [...prevFilters.excludeTags || []];
        
        // Remove the keyword from both arrays first
        includeTags = includeTags.filter(t => t !== keyword);
        excludeTags = excludeTags.filter(t => t !== keyword);
        
        // Add to the appropriate array based on state
        if (state === KeywordVisibilityState.FOCUSED) {
          // Glowing eye - only show tenders with this keyword
          includeTags.push(keyword);
        } else if (state === KeywordVisibilityState.HIDDEN) {
          // Eye off - exclude tenders with this keyword
          excludeTags.push(keyword);
        }
        // Normal eye - show all (already removed from both arrays)
        
        return {
          ...prevFilters,
          includeTags,
          excludeTags
        };
      });
    };
    
    window.addEventListener('toggleKeywordVisibility', handleToggleKeywordVisibility as EventListener);
    
    return () => {
      window.removeEventListener('toggleKeywordVisibility', handleToggleKeywordVisibility as EventListener);
    };
  }, []);

  return (
    <div className={cn("h-[85vh] rounded-lg shadow-sm", className)}>
      <div className="flex flex-col h-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading tenders...</p>
            </div>
          </div>
        ) : (
          <>
            {/* HEADER - Fixed at the top */}
            <div className="sticky top-0 left-0 right-0 z-50 bg-white border rounded-lg">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant={activeTab === 'inbox' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('inbox')}
                    className="flex items-center gap-2"
                  >
                    <Inbox className="h-4 w-4" />
                    <span>Inbox</span>
                    {inboxCount > 0 && (
                      <span className="ml-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs">
                        {inboxCount}
                      </span>
                    )}
                  </Button>
                  <Button
                    variant={activeTab === 'archived' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('archived')}
                    className="flex items-center gap-2"
                  >
                    <Archive className="h-4 w-4" />
                    <span>Archived</span>
                    {archivedCount > 0 && (
                      <span className="ml-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs">
                        {archivedCount}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="px-4 pb-4">
                <Collapsible>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-4 min-w-0">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium shrink-0">Filters</span>
                      {activeFiltersText && (
                        <span className="text-sm text-muted-foreground truncate max-w-[1000px]">
                          {activeFiltersText}
                        </span>
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="rounded-lg border bg-card mt-2 p-4">
                    <TenderFilters
                      tags={allTags}
                      types={allTypes}
                      tenders={localTenders}
                      dateRange={dateRange}
                      onFilterChange={handleFilterChange}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>

            {/* CONTENT - Scrollable area */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <div className="space-y-8">
                  {groupedTenders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <div className="rounded-full bg-muted p-6 mb-4">
                        <Archive className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">No tender found</h3>
                      <p className="text-muted-foreground max-w-md mb-6">
                        {activeTab === 'inbox' 
                          ? "Your inbox is empty. Use the keyword panel to search for new tenders." 
                          : "You haven't archived any tenders yet."}
                      </p>
                      {activeTab === 'inbox' && (
                        <Button 
                          variant="outline" 
                          onClick={() => document.querySelector('.keyword-panel button')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          Search for tenders
                        </Button>
                      )}
                    </div>
                  ) : (
                    groupedTenders.map(({ date, tenders: tenderGroups }) => (
                      <div key={date} className="space-y-4">
                        <h3 className="text-lg font-semibold">
                          {format(new Date(date), 'MMMM yyyy')}
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            {tenderGroups.length} tender{tenderGroups.length !== 1 ? 's' : ''}
                          </span>
                        </h3>
                        <div>
                          <AnimatePresence mode="sync">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                              {tenderGroups
                                .sort((a, b) => b.tender.date - a.tender.date)
                                .map((group) => (
                                  <motion.div
                                    key={`${group.tender.job_number}-${group.tender.date}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
                                    transition={{ duration: 0.3 }}
                                    layout
                                    layoutId={`tender-${group.tender.id}`}
                                  >
                                    <TenderCard
                                      tender={group.tender}
                                      versions={group.versions || []}
                                      relatedTenders={group.relatedTenders}
                                      onArchive={handleArchive}
                                      onHighlight={handleHighlight}
                                    />
                                  </motion.div>
                                ))}
                            </div>
                          </AnimatePresence>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 