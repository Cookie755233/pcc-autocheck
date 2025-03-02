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
import { Badge } from "@/components/ui/badge"
import { ExportButton } from "@/components/dashboard/export-button"
import { useNotifications } from "@/contexts/notification-context"

// Create a custom ArchiveAll icon component
const ArchiveAll = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="4" width="20" height="5" rx="2" />
    <path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" />
    <path d="m9 14 3 3 3-3" />
    <path d="M12 12v5" />
    <path d="M3 3v2" />
    <path d="M7 3v2" />
    <path d="M11 3v2" />
    <path d="M15 3v2" />
    <path d="M19 3v2" />
  </svg>
);

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
  const [activeTab, setActiveTab] = useState<"inbox" | "archived">("inbox")
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

  const { addNewTender, notifications, isNew } = useNotifications()

  useEffect(() => {
    function handleTenderFound(event: CustomEvent) {
      console.log("📥 TenderBoard received tender:", event.detail);
      
      // Add the new tender to local state
      setLocalTenders(prev => {
        const newTender = event.detail;
        // Check if tender already exists
        if (prev.some(t => t.tender.id === newTender.tender.id)) {
          return prev;
        }
        return [...prev, newTender];
      });
    }

    // Add event listener
    window.addEventListener('tenderFound', handleTenderFound as EventListener);

    return () => {
      window.removeEventListener('tenderFound', handleTenderFound as EventListener);
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

  // Add these state variables near the top of the component
  const [searchQuery, setSearchQuery] = useState('');
  const [titleSearchFilter, setTitleSearchFilter] = useState('');

  // Modify the filteredTenders function to include title search
  const filteredTenders = useMemo(() => {
    if (!boardFilteredTenders) {
      console.log('No board filtered tenders available');
      return [];
    }
    
    // console.log(`Starting filtering with ${boardFilteredTenders.length} tenders`);
    // console.log('Current filters:', filters);
    
    const result = boardFilteredTenders.filter(group => {
      const tender = group.tender;
      const versions = group.versions || [];
      
      // Title search filter
      if (titleSearchFilter) {
        const tenderTitle = (tender.title || '').toLowerCase();
        if (!tenderTitle.includes(titleSearchFilter)) {
          return false;
        }
      }
      
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
  }, [boardFilteredTenders, filters, titleSearchFilter]);

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
      sortDirection,
      includeTags: filters.includeTags,
      excludeTags: filters.excludeTags
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

  // Update the handleFilter function to set filteredTenders
  const handleFilter = useCallback((filteredResults: Tender[]) => {
    setFilteredTenders(filteredResults);
  }, []);

  // Helper function to check if a tender matches the current filters
  const matchesTenderFilters = (group: TenderGroup) => {
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
    
    // Filter by organizations
    if (filters.organizations.length > 0) {
      const orgs = [];
      if (tender?.unit_name) {
        orgs.push(tender.unit_name);
      }
      versions.forEach(v => {
        const versionOrg = v.data?.unit_name || 
                           v.enrichedData?.unit_name || 
                           v.data?.detail?.["機關資料:機關名稱"] || 
                           v.data?.detail?.["機關資料:單位名稱"];
        if (versionOrg) {
          orgs.push(versionOrg);
        }
      });
      if (!orgs.some(org => filters.organizations.includes(org))) {
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
    if (filters.dateRange && filters.dateRange.length === 2 && 
        filters.dateRange[0] !== 0 && filters.dateRange[1] !== 0) {
      try {
        const dateStr = tender.date.toString();
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        
        const tenderDate = new Date(year, month, day);
        
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
        endDate.setDate(endDate.getDate() + 1);
        
        if (tenderDate < startDate || tenderDate > endDate) {
          return false;
        }
      } catch (error) {
        return true;
      }
    }
    
    return true;
  };

  // Calculate visible counts based on filtered results
  const visibleInboxCount = activeTab === "inbox" 
    ? filteredTenders.length 
    : localTenders.filter(group => 
        !(group.tender.isArchived === true || group.tender.archived === true) &&
        matchesTenderFilters(group)
      ).length;

  const visibleArchivedCount = activeTab === "archived" 
    ? filteredTenders.length 
    : localTenders.filter(group => 
        (group.tender.isArchived === true || group.tender.archived === true) &&
        matchesTenderFilters(group)
      ).length;

  // Calculate counts for each section
  const inboxTenders = localTenders.filter(group => !group.tender.archived);
  const archivedTenders = localTenders.filter(group => group.tender.archived);
  
  // Total counts for each section
  const totalInboxCount = inboxCount;
  const totalArchivedCount = archivedCount;

  // Add this function to handle clearing the "new" status
  const clearNewStatus = (tenderId: string) => {
    setLocalTenders(prev => 
      prev.map(group => {
        if (group.tender.id === tenderId) {
          return {
            ...group,
            tender: {
              ...group.tender,
              isNew: false
            }
          };
        }
        return group;
      })
    );
  };

  // Add an effect to listen for the URL parameter
  useEffect(() => {
    const url = new URL(window.location.href);
    const highlightId = url.searchParams.get('highlight');
    
    if (highlightId) {
      // Clear the "new" status for this tender
      clearNewStatus(highlightId);
      
      // Scroll to the highlighted tender
      const element = document.getElementById(`tender-${highlightId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Flash effect to draw attention
        element.classList.add('flash-highlight');
        setTimeout(() => {
          element.classList.remove('flash-highlight');
        }, 2000);
      }
    }
  }, []);

  const handleNewStatusChange = (tenderId: string, isNew: boolean) => {
    setLocalTenders(prev => 
      prev.map(group => {
        if (group.tender.id === tenderId) {
          return {
            ...group,
            tender: {
              ...group.tender,
              isNew: isNew
            }
          };
        }
        return group;
      })
    );
  };

  // Listen for read status changes
  useEffect(() => {
    const handleReadStatusChange = (event: CustomEvent) => {
      const { tenderId, isRead } = event.detail;
      if (isRead) {
        handleNewStatusChange(tenderId, false);
      }
    };

    window.addEventListener('tenderReadStatusChanged', handleReadStatusChange as EventListener);
    return () => {
      window.removeEventListener('tenderReadStatusChanged', handleReadStatusChange as EventListener);
    };
  }, []);

  return (
    <div className={cn("h-[87vh] rounded-lg shadow-sm", className)}>
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
            <div className="sticky top-0 left-0 right-0 z-50 bg-white border rounded-lg dark:bg-gray-900/50 dark:border-gray-800 dark:shadow-[0_2px_10px_rgba(255,255,255,0.05)]">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant={activeTab === 'inbox' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('inbox')}
                    className="flex items-center gap-2 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <Inbox className="h-4 w-4" />
                    <span>Inbox</span>
                    <span className="ml-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs dark:bg-primary/30">
                      {visibleInboxCount}/{totalInboxCount}
                    </span>
                  </Button>
                  <Button
                    variant={activeTab === 'archived' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('archived')}
                    className="flex items-center gap-2 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <Archive className="h-4 w-4" />
                    <span>Archived</span>
                    <span className="ml-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs dark:bg-primary/30">
                      {visibleArchivedCount}/{totalArchivedCount}
                    </span>
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Global Search */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search titles..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        // Apply the search filter
                        if (e.target.value.trim() === '') {
                          // If search is cleared, reset to normal filtering
                          setTitleSearchFilter('');
                        } else {
                          // Apply the search filter
                          setTitleSearchFilter(e.target.value.toLowerCase());
                        }
                      }}
                      className="h-9 w-64 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-gray-800 dark:border-gray-700"
                    />
                    {searchQuery && (
                      <button 
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-gray-200"
                        onClick={() => {
                          setSearchQuery('');
                          setTitleSearchFilter('');
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  
                  {/* Archive All Button - Only show for inbox tab */}
                  {activeTab === 'inbox' && filteredTenders.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 h-9 dark:border-gray-700 dark:hover:bg-gray-800"
                      onClick={() => {
                        // Confirm before archiving all
                        if (window.confirm(`Archive all ${filteredTenders.length} visible tenders?`)) {
                          // Archive all filtered tenders
                          filteredTenders.forEach(group => {
                            if (!group.tender.isArchived && !group.tender.isHighlighted) {
                              handleArchive(group.tender.id, true);
                            }
                          });
                          
                          toast({
                            title: "Bulk Archive",
                            description: `${filteredTenders.length} tenders have been archived`,
                            variant: "success",
                          });
                        }
                      }}
                    >
                      <ArchiveAll className="h-4 w-4" />
                      <span className="text-sm">Archive All</span>
                    </Button>
                  )}
                  
                  <ExportButton tenders={filteredTenders} />
                </div>
              </div>
              
              <div className="px-4 pb-4">
                <Collapsible>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card p-4 dark:border-gray-700 dark:bg-gray-800/90">
                    <div className="flex items-center gap-4 min-w-0">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium shrink-0">Filters</span>
                      {activeFiltersText && (
                        <span className="text-sm text-muted-foreground truncate max-w-[700px] dark:text-gray-400">
                          {activeFiltersText}
                        </span>
                      )}
                    </div>
                    {(filters.organizations.length > 0 || filters.types.length > 0) && (
                      <Button 
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent collapsible from toggling
                          // Clear all filters
                          setFilters({
                            ...filters,
                            organizations: [],
                            types: [],
                          });
                          // Call handleFilterChange to update the UI
                          handleFilterChange({
                            tags: filters.tags,
                            types: [],
                            organizations: [],
                            dateRange: filters.dateRange,
                            sortDirection: filters.sortDirection
                          });
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="rounded-lg border bg-card mt-2 p-4 dark:border-gray-700 dark:bg-gray-800/90">
                    <TenderFilters
                      tags={allTags}
                      types={allTypes}
                      tenders={activeTab === "inbox" ? inboxTenders : archivedTenders}
                      dateRange={dateRange}
                      onFilterChange={handleFilterChange}
                      currentFilters={filters}
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
                                      isNew={isNew(group.tender.id)}
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