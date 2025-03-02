"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TenderGroup } from "@/types/tender"
import { useUser } from "@clerk/nextjs"
import { useToast } from "@/components/ui/use-toast"
import { format, addMonths } from "date-fns"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Minus, Plus } from "lucide-react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

// Add color mapping for different tender types
const TYPE_COLORS = {
  "公開招標公告": "bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-200",
  "公開招標更正公告": "bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-200",
  
  "經公開評選或公開徵求之限制性招標公告":"bg-orange-100 text-orange-700 dark:bg-orange-800/40 dark:text-orange-200",
  "經公開評選或公開徵求之限制性招標更正公告": "bg-orange-100 text-orange-700 dark:bg-orange-800/40 dark:text-orange-200",
  "限制性招標(經公開評選或公開徵求)公告": "bg-orange-100 text-orange-700 dark:bg-orange-800/40 dark:text-orange-200",
  "限制性招標(經公開評選或公開徵求)更正公告": "bg-orange-100 text-orange-700 dark:bg-orange-800/40 dark:text-orange-200",
  
  "決標公告": "bg-sky-100 text-sky-700 dark:bg-sky-800/40 dark:text-sky-200",
  
  "無法決標公告": "bg-rose-100 text-rose-700 dark:bg-rose-800/40 dark:text-rose-200",
  
  "default": "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-200",
  "公開取得報價單或企劃書公告": "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-200",
  "公開取得報價單或企劃書更正公告": "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-200",
  "財物出租更正公告": "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-200",
  "財務變賣公告": "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-200",

} as const;

// Add this constant at the top with other constants
function getTenderDates(version: any) {
  const detail = version.data?.detail || {};
  const type = version.type || '';

  if (type.includes('招標')) {
    return {
      startDate: detail['招標資料:公告日'],
      endDate: detail['領投開標:截止投標']
    };
  } 
  if (type.includes('決標')) {
    return {
      startDate: detail['已公告資料:原公告日期'],
      endDate: detail['決標資料:決標公告日期']
    };
  } 
  if (type.includes('無法決標')) {
    return {
      startDate: detail['無法決標公告:原招標公告之刊登採購公報日期'],
      endDate: detail['無法決標公告:無法決標公告日期']
    };
  }
  if (type.includes('出租')) {
    return {
      startDate: version.date || detail['標案內容:截標時間'],
      endDate: detail['標案內容:截標時間']
    };
  }

  return {
    startDate: version.date,
    endDate: undefined
  };
}

export default function StatisticsPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [localTenders, setLocalTenders] = useState<TenderGroup[]>([])
  const [userKeywords, setUserKeywords] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTender, setSelectedTender] = useState<TenderGroup | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState<'months' | 'years'>('months');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showHighlightedOnly, setShowHighlightedOnly] = useState(false);
  
  // Add refs for the intersections
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const monthHeadersRef = useRef<HTMLDivElement>(null);
  const timelineContentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Helper function to safely parse dates
  function parseTenderDate(dateStr: string | number | undefined): Date {
    if (!dateStr) return new Date();
    
    try {
      //! Debug log for date parsing
      console.log("Parsing date:", dateStr);
      
      // Handle ROC date format (e.g., "113/10/24" or "113/1/1 17:00")
      if (typeof dateStr === 'string') {
        // Check for ROC date format with optional time
        const rocDateTimeRegex = /^(\d{1,3})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?$/;
        const match = dateStr.match(rocDateTimeRegex);
        
        if (match) {
          const [_, yearStr, monthStr, dayStr, hourStr, minuteStr] = match;
          const year = parseInt(yearStr) + 1911; // Convert ROC year to Gregorian
          const month = parseInt(monthStr) - 1; // JS months are 0-indexed
          const day = parseInt(dayStr);
          
          // Create date with or without time component
          if (hourStr && minuteStr) {
            const hour = parseInt(hourStr);
            const minute = parseInt(minuteStr);
            const date = new Date(year, month, day, hour, minute);
            // console.log(`Parsed ROC date with time: ${dateStr} → ${date.toISOString()}`);
            return isNaN(date.getTime()) ? new Date() : date;
          } else {
            const date = new Date(year, month, day);
            // console.log(`Parsed ROC date: ${dateStr} → ${date.toISOString()}`);
            return isNaN(date.getTime()) ? new Date() : date;
          }
        }
        
        // Handle YYYYMMDD format
        if (/^\d{8}$/.test(dateStr)) {
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6)) - 1;
          const day = parseInt(dateStr.substring(6, 8));
          const date = new Date(year, month, day);
          console.log(`Parsed YYYYMMDD date: ${dateStr} → ${date.toISOString()}`);
          return isNaN(date.getTime()) ? new Date() : date;
        }
      }

      // Fallback to default date
      console.log(`Could not parse date: ${dateStr}, using current date`);
      return new Date();
    } catch (error) {
      console.error("Error parsing date:", dateStr, error);
      return new Date();
    }
  }

  // Fetch tenders from the database
  useEffect(() => {
    async function fetchTenders() {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        console.log("Fetching tenders for statistics view...");
        
        // Fetch tenders
        const tenderResponse = await fetch(`/api/tenders/views?userId=${user.id}`);
        if (!tenderResponse.ok) throw new Error("Failed to fetch tenders");
        
        const tenderData = await tenderResponse.json();
        console.log("Fetched tenders:", tenderData.length);
        setLocalTenders(tenderData);
        
        // Fetch user's keywords
        const keywordResponse = await fetch(`/api/keywords?userId=${user.id}`);
        if (!keywordResponse.ok) throw new Error("Failed to fetch keywords");
        
        const keywordData = await keywordResponse.json();
        console.log("Fetched user keywords:", keywordData);
        setUserKeywords(keywordData.map((keyword: any) => keyword.text));
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load tenders or keywords. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchTenders();
  }, [user?.id, toast]);

  // Format tenders with proper structure and correct dates
  const formattedTenders = useMemo(() => {
    console.log("Raw tenders:", localTenders);
    
    const formatted = localTenders.map(group => {
      const versions = group.versions || [];
      const latestVersion = versions[versions.length - 1];
      const dates = getTenderDates(latestVersion);
      
      const tender = {
        ...group.tender,
        title: latestVersion?.data?.detail?.['採購資料:標案名稱'] || group.tender.title || 'No title',
        startDate: dates.startDate,
        endDate: dates.endDate,
        type: latestVersion?.type || 'default',
        brief: latestVersion?.data?.detail || {},
        versions: versions
      };
      
      console.log("Processed tender:", {
        id: tender.id,
        title: tender.title,
        type: tender.type,
        startDate: tender.startDate,
        endDate: tender.endDate
      });
      
      return { tender, versions, relatedTenders: group.relatedTenders || [] };
    });
    
    return formatted;
  }, [localTenders]);

  // Get the list of available tender types from the actual data
  const availableTenderTypes = useMemo(() => {
    //@ Extract unique tender types from the current data
    const typeSet = new Set<string>();
    
    formattedTenders.forEach(group => {
      const latestVersion = group.versions[group.versions.length - 1];
      if (latestVersion?.type) {
        typeSet.add(latestVersion.type);
      }
    });
    
    // Convert to array and sort
    return Array.from(typeSet).sort();
  }, [formattedTenders]);

  // Group tenders by user's keywords instead of tender tags
  const timelineData = useMemo(() => {
    console.log("Creating timeline data with user keywords:", userKeywords);
    const groupedTenders: Record<string, {
      tenders: TenderGroup[];
      rows: Array<{
        tenders: TenderGroup[];
        startDate: Date;
        endDate: Date;
      }>;
    }> = {};
    
    // Initialize groupedTenders with user's keywords
    userKeywords.forEach(keyword => {
      groupedTenders[keyword] = {
        tenders: [],
        rows: []
      };
    });
    
    // Now match tenders to keywords
    formattedTenders.forEach(group => {
      // Get the title and other searchable fields from the tender
      const tenderTitle = group.tender.title?.toLowerCase() || '';
      const tenderType = group.tender.type?.toLowerCase() || '';
      const tenderBrief = JSON.stringify(group.tender.brief || {}).toLowerCase();
      
      // Check which of the user's keywords match this tender
      userKeywords.forEach(keyword => {
        const lowercaseKeyword = keyword.toLowerCase();
        
        // If the tender contains this keyword in title, type, or brief
        if (
          tenderTitle.includes(lowercaseKeyword) || 
          tenderType.includes(lowercaseKeyword) || 
          tenderBrief.includes(lowercaseKeyword)
        ) {
          // Add to the keyword's tenders
          groupedTenders[keyword].tenders.push(group);
          
          // Check if this tender is related to any existing tenders in this keyword
          const relatedTenderRow = groupedTenders[keyword].rows.findIndex(row => 
            row.tenders.some(existingGroup => 
              existingGroup.tender.id === group.tender.id ||
              existingGroup.relatedTenders?.some(related => related.id === group.tender.id)
            )
          );

          if (relatedTenderRow !== -1) {
            // Add to existing row if related
            groupedTenders[keyword].rows[relatedTenderRow].tenders.push(group);
          } else {
            // Create new row for unrelated tender
            groupedTenders[keyword].rows.push({
              tenders: [group],
              startDate: parseTenderDate(group.tender.startDate),
              endDate: parseTenderDate(group.tender.endDate)
            });
          }
        }
      });
    });
    
    // Filter out keywords with no matching tenders
    const filteredGroupedTenders: typeof groupedTenders = {};
    Object.entries(groupedTenders).forEach(([keyword, data]) => {
      if (data.tenders.length > 0) {
        filteredGroupedTenders[keyword] = data;
      }
    });
    
    console.log("Timeline data created:", { 
      keywordCount: Object.keys(filteredGroupedTenders).length,
      totalTenders: Object.values(filteredGroupedTenders).reduce((sum, data) => sum + data.tenders.length, 0)
    });
    
    return filteredGroupedTenders;
  }, [formattedTenders, userKeywords]);

  // Filter by selected date if any and by type if selected
  const filteredData = useMemo(() => {
    let filtered = timelineData;
    
    // Enhanced debug logging
    console.log("Filtering timeline data:", { 
      typeFilter, 
      showHighlightedOnly,
      keywordCount: Object.keys(timelineData).length,
      hasSelectedDate: !!selectedDate,
      rawDataCount: formattedTenders.length
    });
    
    // Only apply date filter if a date is explicitly selected
    if (selectedDate) {
      const dateFiltered: typeof timelineData = {};
      Object.entries(timelineData).forEach(([keyword, data]) => {
        const filteredTenders = data.tenders.filter(group => {
          try {
            const tenderDate = new Date(group.tender.date);
            return (
              tenderDate.getFullYear() === selectedDate.getFullYear() &&
              tenderDate.getMonth() === selectedDate.getMonth() &&
              tenderDate.getDate() === selectedDate.getDate()
            );
          } catch (error) {
            console.error("Error filtering by date:", error);
            return false; // Skip items with invalid dates
          }
        });

        if (filteredTenders.length > 0) {
          dateFiltered[keyword] = {
            ...data,
            tenders: filteredTenders
          };
        }
      });
      filtered = dateFiltered;
    }
    
    // Type filter
    if (typeFilter) {
      const typeFiltered: typeof timelineData = {};
      Object.entries(filtered).forEach(([keyword, data]) => {
        const filteredTenders = data.tenders.filter(group => {
          try {
            // Filter by the tender type of the latest version
            const latestVersion = group.versions[group.versions.length - 1];
            return latestVersion?.type === typeFilter;
          } catch (error) {
            console.error("Error filtering by type:", error);
            return false; // Skip items with invalid type
          }
        });
        
        if (filteredTenders.length > 0) {
          // We need to filter rows too
          const filteredRows = data.rows.map(row => {
            // Keep only tenders that match the type filter
            const filteredRowTenders = row.tenders.filter(group => {
              try {
                const latestVersion = group.versions[group.versions.length - 1];
                return latestVersion?.type === typeFilter;
              } catch (error) {
                console.error("Error filtering row tenders:", error);
                return false; // Skip items with invalid type
              }
            });
            
            return {
              ...row,
              tenders: filteredRowTenders
            };
          }).filter(row => row.tenders.length > 0); // Remove empty rows
          
          typeFiltered[keyword] = {
            tenders: filteredTenders,
            rows: filteredRows
          };
        }
      });
      filtered = typeFiltered;
    }
    
    // Highlighted filter
    if (showHighlightedOnly) {
      const highlightedFiltered: typeof timelineData = {};
      Object.entries(filtered).forEach(([keyword, data]) => {
        const filteredTenders = data.tenders.filter(group => group.tender.isHighlighted === true);
        
        if (filteredTenders.length > 0) {
          // Filter rows to only include highlighted tenders
          const filteredRows = data.rows.map(row => {
            const filteredRowTenders = row.tenders.filter(group => group.tender.isHighlighted === true);
            return {
              ...row,
              tenders: filteredRowTenders
            };
          }).filter(row => row.tenders.length > 0); // Remove empty rows
          
          highlightedFiltered[keyword] = {
            tenders: filteredTenders,
            rows: filteredRows
          };
        }
      });
      filtered = highlightedFiltered;
    }

    console.log("Filter results:", {
      keywordCount: Object.keys(filtered).length,
      totalTenders: Object.values(filtered).reduce((sum, data) => sum + data.tenders.length, 0),
      hasTenders: Object.keys(filtered).length > 0
    });
    
    return filtered;
  }, [timelineData, selectedDate, typeFilter, showHighlightedOnly, formattedTenders.length]);

  // Calculate timeline range based on tenders - MODIFIED to ensure all tenders are visible
  const timelineRange = useMemo(() => {
    const today = new Date();
    
    try {
      // First gather all dates from tenders to determine the full timeline range
      const dates = formattedTenders
        .flatMap(group => {
          const startDate = parseTenderDate(group.tender.startDate);
          const endDate = parseTenderDate(group.tender.endDate);
          return [startDate, endDate];
        })
        .filter(date => date instanceof Date && !isNaN(date.getTime()));

      // If we have valid dates, use them to determine the full range
      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        
        // Add extra months to the end based on zoom level
        const extraMonths = Math.max(3, Math.round(6 / zoomLevel));
        const extendedEndDate = addMonths(maxDate, extraMonths);
        
        console.log("Full timeline range from all tenders:", { 
          minDate: minDate.toISOString(),
          maxDate: maxDate.toISOString(),
          extendedEndDate: extendedEndDate.toISOString()
        });

        return { 
          start: minDate,
          end: extendedEndDate,
          defaultViewStart: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()), // For initial scroll
          defaultViewEnd: today // For initial scroll
        };
      }

      // Fallback if no tenders with valid dates
      const defaultStart = new Date(today.getFullYear() - 2, today.getMonth(), 1); // Further back for empty state
      const defaultEnd = addMonths(today, 3);
      
      console.log("Using default timeline range:", {
        start: defaultStart.toISOString(),
        end: defaultEnd.toISOString()
      });
      
      return { 
        start: defaultStart,
        end: defaultEnd,
        defaultViewStart: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()),
        defaultViewEnd: today
      };
    } catch (error) {
      console.error("Error calculating timeline range:", error);
      
      // Safe fallback
      const defaultStart = new Date(today.getFullYear() - 2, today.getMonth(), 1);
      const defaultEnd = addMonths(today, 3);
      
      return { 
        start: defaultStart, 
        end: defaultEnd,
        defaultViewStart: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()),
        defaultViewEnd: today
      };
    }
  }, [formattedTenders, zoomLevel]);

  // Generate months array for the timeline
  const months = useMemo(() => {
    const result = [];
    let current = new Date(timelineRange.start);
    
    if (viewMode === 'years') {
      // For year view, create one entry per year
      const startYear = current.getFullYear();
      const endYear = timelineRange.end.getFullYear();
      
      for (let year = startYear; year <= endYear; year++) {
        result.push(new Date(year, 0, 1)); // January 1st of each year
      }
    } else {
      // For month view, create one entry per month
      while (current <= timelineRange.end) {
        result.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }
    }
    
    console.log(`Generated ${viewMode}:`, result.map(d => 
      viewMode === 'years' ? format(d, 'yyyy') : format(d, 'MMM yyyy')
    ));
    
    return result;
  }, [timelineRange, viewMode]);

  // Update row height and set up sticky effects
  useEffect(() => {
    console.log("Timeline layout:", {
      zoomLevel,
      contentWidth: `${1200 * zoomLevel}px`,
      timelineRange: {
        start: timelineRange.start.toISOString(),
        end: timelineRange.end.toISOString()
      }
    });
    
  }, [zoomLevel, timelineRange]);

  // Synchronize horizontal scrolling between headers and content
  useEffect(() => {
    const monthHeadersEl = monthHeadersRef.current;
    const timelineContentEl = timelineContentRef.current;
    
    if (!monthHeadersEl || !timelineContentEl) return;
    
    let isScrolling = false;
    
    //@ Sync scroll between month headers and timeline content
    const syncScroll = (e: Event) => {
      if (isScrolling) return; // Prevent infinite scroll loop
      
      isScrolling = true;
      
      try {
        const target = e.target as HTMLElement;
        
        if (target === monthHeadersEl) {
          // When month headers are scrolled, update timeline content
          timelineContentEl.scrollLeft = monthHeadersEl.scrollLeft;
          // console.log("Syncing from headers to content:", monthHeadersEl.scrollLeft);
        } else if (target === timelineContentEl) {
          // When timeline content is scrolled, update month headers
          monthHeadersEl.scrollLeft = timelineContentEl.scrollLeft;
          // console.log("Syncing from content to headers:", timelineContentEl.scrollLeft);
        }
      } catch (error) {
        console.error("Error syncing scroll:", error);
      }
      
      // Reset the flag after a short delay to allow the scroll to complete
      setTimeout(() => {
        isScrolling = false;
      }, 10);
    };
    
    // Use passive: true for better performance
    monthHeadersEl.addEventListener('scroll', syncScroll, { passive: true });
    timelineContentEl.addEventListener('scroll', syncScroll, { passive: true });
    
    // Initial sync
    const initialSync = () => {
      try {
        // Force both elements to have the same scroll position
        const initialPosition = 0;
        monthHeadersEl.scrollLeft = initialPosition;
        timelineContentEl.scrollLeft = initialPosition;
        console.log("Initial scroll sync complete");
      } catch (error) {
        console.error("Error in initial sync:", error);
      }
    };
    
    // Run initial sync after a short delay to ensure elements are properly rendered
    const timeoutId = setTimeout(initialSync, 100);
    
    // Add visual grid lines to help with alignment
    const addGridLines = () => {
      try {
        const container = timelineContainerRef.current;
        if (!container) return;
        
        // Clear existing grid lines
        const existingLines = container.querySelectorAll('.month-grid-line');
        existingLines.forEach(line => line.remove());
        
        // Add new grid lines at month boundaries
        const monthWidth = 100 * zoomLevel;
        months.forEach((_, i) => {
          const line = document.createElement('div');
          line.className = 'month-grid-line absolute top-0 bottom-0 pointer-events-none';
          line.style.left = `${i * monthWidth}px`;
          line.style.height = '100%';
          line.style.zIndex = '1';
          container.appendChild(line);
        });
      } catch (error) {
        console.error("Error adding grid lines:", error);
      }
    };
    
    // Add grid lines after a short delay
    const gridLinesTimeoutId = setTimeout(addGridLines, 200);
    
    return () => {
      monthHeadersEl.removeEventListener('scroll', syncScroll);
      timelineContentEl.removeEventListener('scroll', syncScroll);
      clearTimeout(timeoutId);
      clearTimeout(gridLinesTimeoutId);
    };
  }, [months, zoomLevel]);

  // Set initial scroll position to show the default view (past year)
  useEffect(() => {
    // Wait for timeline to be fully rendered
    const timeoutId = setTimeout(() => {
      try {
        if (!monthHeadersRef.current || !timelineContentRef.current || !timelineRange.defaultViewStart) return;
        
        // Calculate the position to scroll to (to show the default view)
        const timelineStartTime = timelineRange.start.getTime();
        const defaultViewStartTime = timelineRange.defaultViewStart.getTime();
        const totalTimelineMs = timelineRange.end.getTime() - timelineStartTime;
        
        // Calculate the percentage through the timeline
        const scrollPercentage = (defaultViewStartTime - timelineStartTime) / totalTimelineMs;
        
        // Get the total scrollable width
        const totalWidth = monthHeadersRef.current.scrollWidth - monthHeadersRef.current.clientWidth;
        
        // Calculate scroll position
        const scrollPosition = Math.max(0, Math.floor(scrollPercentage * totalWidth));
        
        console.log("Setting initial scroll position:", {
          scrollPercentage,
          scrollPosition,
          totalWidth,
          defaultViewStart: timelineRange.defaultViewStart.toISOString()
        });
        
        // Set scroll position for both elements
        monthHeadersRef.current.scrollLeft = scrollPosition;
        timelineContentRef.current.scrollLeft = scrollPosition;
      } catch (error) {
        console.error("Error setting initial scroll position:", error);
      }
    }, 300); // Delay to ensure the timeline is rendered
    
    return () => clearTimeout(timeoutId);
  }, [timelineRange, formattedTenders.length, months.length, viewMode]);

  // Fix type issues with tender details access in the UI
  const renderTenderDetails = (tender: any) => {
    const brief = tender.brief || {};
    const type = tender.type || 'default';
    const startDate = tender.startDate;
    const endDate = tender.endDate || startDate;
    
    return {
      title: tender.title || 'Untitled Tender',
      type,
      brief,
      startDate,
      endDate
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto px-4 py-6">
      {/* Main header - Sticky */}
      <div className="flex items-center justify-between sticky top-[64px] z-50 pb-2">
        <h1 className="text-3xl font-bold">Tender Timeline</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {format(timelineRange.start, 'MMM yyyy')} - {format(timelineRange.end, 'MMM yyyy')}
          </div>
          
          {/* View mode toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button 
              variant={viewMode === 'months' ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8"
              onClick={() => setViewMode('months')}
            >
              Months
            </Button>
            <div className="w-[1px] h-4 bg-border" />
            <Button 
              variant={viewMode === 'years' ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8"
              onClick={() => setViewMode('years')}
            >
              Years
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 border rounded-lg p-1 bg-white/50 dark:bg-gray-800/50 dark:border-gray-700">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-sm hover:bg-accent dark:hover:bg-gray-700/70"
                onClick={() => {
                  const newZoom = Math.max(0.5, zoomLevel - 0.25);
                  console.log("Zoom out:", { oldZoom: zoomLevel, newZoom });
                  setZoomLevel(newZoom);
                }}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="w-[1px] h-4 bg-border dark:bg-gray-700" />
              <Button 
                variant="ghost" 
                size="icon"
                className="h-7 w-7 hover:bg-accent dark:hover:bg-gray-700/70"
                onClick={() => {
                  const newZoom = Math.min(2, zoomLevel + 0.25);
                  console.log("Zoom in:", { oldZoom: zoomLevel, newZoom });
                  setZoomLevel(newZoom);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Type filter dropdown */}
            <div className="border rounded-lg overflow-hidden flex items-center h-10 bg-white/50 dark:bg-gray-800/50 dark:border-gray-700">
              <select
                className="h-full text-sm px-3 bg-transparent border-none focus:outline-none focus:ring-0 dark:text-gray-200"
                value={typeFilter || ""}
                onChange={(e) => {
                  console.log("Type filter changed:", e.target.value);
                  setTypeFilter(e.target.value || null);
                }}
              >
                <option value="">All Types</option>
                {availableTenderTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Highlighted only toggle */}
            <Button
              variant={showHighlightedOnly ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-10 px-3 transition-colors",
                showHighlightedOnly 
                  ? "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-700" 
                  : "text-yellow-600 border-yellow-200 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-900/50 dark:hover:bg-yellow-900/20"
              )}
              onClick={() => setShowHighlightedOnly(!showHighlightedOnly)}
            >
              {showHighlightedOnly ? "Highlighted Only" : "Show Highlighted"}
            </Button>
          </div>
        </div>
      </div>

      {/* Show message when there are no tenders to display after filtering */}
      {Object.keys(filteredData).length === 0 ? (
        <div className="border rounded-2xl overflow-hidden p-10 text-center bg-card dark:bg-gray-600/50">
          <div className="text-lg font-medium">No tender found</div>
          <p className="text-muted-foreground mt-1">
            {typeFilter 
              ? `No tender match the filter "${typeFilter}". Try selecting a different type.` 
              : selectedDate
                ? "No tender found for the selected date. Try a different date."
                : "No tender available to display. Please check your data source."}
          </p>
          {(typeFilter || selectedDate) && (
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={() => {
                setTypeFilter(null);
                setSelectedDate(undefined);
                console.log("Clearing all filters");
              }}
            >
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <Card className={cn(
          "border rounded-2xl overflow-hidden mt-10",
          "bg-white dark:bg-gray-900/80",
          "shadow-md hover:shadow-lg",
          "transition-all duration-200",
          typeFilter && "border-l-4 border-l-primary",
          showHighlightedOnly && "border-l-4 border-l-yellow-400",
        )}>
          {/* Main timeline container with horizontal scrolling */}
          <div className="flex flex-col">
            {/* Month headers - Sticky at top */}
            <div className="sticky z-40 bg-background/95 backdrop-blur-sm border-b-2 dark:border-gray-800 dark:bg-gray-900/50">
              <div className="flex">
                {/* Fixed keyword column header */}
                <div className="w-[200px] shrink-0 font-medium sticky left-0 z-50 border-r-2 bg-background/95 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/50">
                  <div className="flex items-center justify-center h-[60px]">
                    Keywords
                  </div>
                </div>
                
                {/* Scrollable month headers */}
                <div 
                  ref={monthHeadersRef}
                  className="overflow-x-auto scrollbar-hide"
                  style={{ 
                    maxWidth: "calc(100% - 220px)", // Match exactly with the keyword column width
                    scrollbarWidth: "none" // Firefox
                  }}
                >
                  <div 
                    className="flex"
                    style={{ 
                      width: `${Math.max(1200, months.length * (viewMode === 'years' ? 200 : 100)) * zoomLevel}px`,
                      minWidth: "100%",
                      transition: 'width 0.5s ease'
                    }}
                  >
                    {months.map((date, i) => (
                      <div 
                        key={i} 
                        className="font-medium p-4"
                        style={{ 
                          width: `${(viewMode === 'years' ? 200 : 100) * zoomLevel}px`,
                          minWidth: `${(viewMode === 'years' ? 200 : 100) * zoomLevel}px`,
                        }}
                      >
                        {viewMode === 'years' ? (
                          // Year view
                          <div className="text-center text-base font-semibold">
                            {format(date, 'yyyy')}
                          </div>
                        ) : zoomLevel < 0.75 ? (
                          // Compact month view
                          <div className="text-center">
                            <div className="text-sm">{format(date, 'MMM')}</div>
                            {i === 0 || date.getMonth() === 0 ? (
                              <div className="text-xs text-muted-foreground mt-1">
                                {format(date, 'yyyy')}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          // Regular month view
                          <div className="text-sm">
                            {format(date, 'MMM yyyy')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline content - Scrolls with headers */}
            <div 
              className="relative max-h-[calc(100vh-250px)] overflow-y-auto bg-background/50 backdrop-blur-xl"
              onScroll={(e) => {
                // When vertical scrolling happens, we need to keep the horizontal scroll position in sync
                if (monthHeadersRef.current && timelineContentRef.current) {
                  monthHeadersRef.current.scrollLeft = timelineContentRef.current.scrollLeft;
                }
              }}
            >
              <div className="flex">
                {/* Fixed keyword column */}
                <div className="w-[200px] shrink-0 sticky left-0 z-40 bg-background/90 backdrop-blur-sm border-r-2 dark:border-gray-800 dark:bg-gray-900/50">
                  {Object.entries(filteredData).map(([keyword, data], index) => {
                    // Calculate the total height based on the number of rows
                    const rowCount = Math.max(1, data.rows.length);
                    
                    return (
                      <div 
                        key={keyword}
                        className="border-b border-border dark:border-gray-800"
                        ref={(el) => { sectionRefs.current[keyword] = el; }}
                      >
                        {data.rows.length === 0 ? (
                          // Empty row to match the timeline row
                          <div className="h-[60px] flex items-center px-4 group">
                            <div className="w-full space-y-1">
                              <div className="font-medium text-end relative group">
                                <span className="inline-block max-w-[180px] truncate">{keyword}</span>
                                {keyword.length > 18 && (
                                  <div className="absolute right-0 top-[-5px] scale-0 bg-background/95 shadow-md rounded-md p-2 text-sm z-50 transform transition-transform duration-150 group-hover:scale-100 origin-top-right dark:bg-gray-800/95 dark:shadow-lg dark:border dark:border-gray-700">
                                    {keyword}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground text-end">
                                {data.tenders.length} tenders
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Create matching rows for each timeline row
                          data.rows.map((_, rowIndex) => (
                            <div key={`${keyword}-row-${rowIndex}`} className="h-[60px] flex items-center px-4 group">
                              {rowIndex === 0 && (
                                <div className="w-full space-y-1">
                                  <div className="font-medium text-end relative group">
                                    <span className="inline-block max-w-[180px] truncate">{keyword}</span>
                                    {keyword.length > 18 && (
                                      <div className="absolute right-0 top-[-5px] scale-0 bg-background/95 shadow-md rounded-md p-2 text-sm z-50 transform transition-transform duration-150 group-hover:scale-100 origin-top-right dark:bg-gray-800/95 dark:shadow-lg dark:border dark:border-gray-700">
                                        {keyword}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground text-end">
                                    {data.tenders.length} tenders
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Scrollable timeline content */}
                <div 
                  ref={timelineContentRef}
                  className="overflow-x-auto scrollbar-hide"
                  style={{ 
                    maxWidth: "calc(100% - 220px)", // Match exactly with the keyword column width
                    scrollbarWidth: "none" // Firefox
                  }}
                >
                  <div 
                    ref={timelineContainerRef}
                    style={{ 
                      width: `${Math.max(1200, months.length * (viewMode === 'years' ? 200 : 100)) * zoomLevel}px`,
                      minWidth: "100%",
                      transition: 'width 0.5s ease'
                    }}
                  >
                    {/* Timeline rows */}
                    {Object.entries(filteredData).map(([keyword, data], keywordIndex) => (
                      <div 
                        key={keyword}
                        className="border-b border-border"
                      >
                        {data.rows.length === 0 ? (
                          // Empty placeholder row to maintain alignment
                          <div className="h-[60px]"></div>
                        ) : (
                          // Render rows for this keyword
                          data.rows.map((row, rowIndex) => (
                            <div 
                              key={`${keyword}-row-${rowIndex}`}
                              className="relative h-[60px] flex items-center hover:bg-accent/50 transition-colors"
                            >
                              {/* Tender bars container */}
                              <div className="relative w-full h-10">
                                {row.tenders.map(group => (
                                  <React.Fragment key={group.tender.id}>
                                    {group.versions.map((version, versionIndex) => {
                                      const dates = getTenderDates(version);
                                      const startDate = parseTenderDate(dates.startDate);
                                      const endDate = dates.endDate ? parseTenderDate(dates.endDate) : new Date(startDate.getTime() + (30 * 24 * 60 * 60 * 1000));
                                      
                                      // Calculate position based on months
                                      const timelineStartTime = timelineRange.start.getTime();
                                      const timelineEndTime = timelineRange.end.getTime();
                                      const totalTimelineMs = timelineEndTime - timelineStartTime;
                                      
                                      // Calculate position in pixels
                                      const startTimeOffset = startDate.getTime() - timelineStartTime;
                                      const endTimeOffset = endDate.getTime() - timelineStartTime;
                                      
                                      // Calculate total width based on view mode
                                      const unitWidthPx = (viewMode === 'years' ? 200 : 100) * zoomLevel;
                                      const totalWidthPx = months.length * unitWidthPx;
                                      
                                      // Calculate position as percentage of total timeline width
                                      const startPct = startTimeOffset / totalTimelineMs;
                                      const endPct = endTimeOffset / totalTimelineMs;
                                      
                                      // Convert percentage to pixels
                                      const startPx = startPct * totalWidthPx;
                                      const endPx = endPct * totalWidthPx;
                                      const widthPx = Math.max(30, endPx - startPx); // Ensure minimum width
                                      
                                      // Calculate opacity based on version index
                                      const opacity = 1 - (versionIndex * 0.15);
                                      
                                      // Log position calculations for debugging
                                      if (group.tender.title === "102年推動建築物設置太陽光電設施計畫委託技術服務案") {
                                        console.log(`Target tender position: start: ${startPx.toFixed(2)}px, width: ${widthPx.toFixed(2)}px, startPct: ${(startPct * 100).toFixed(2)}%, endPct: ${(endPct * 100).toFixed(2)}%`);
                                      }

                                      // Check if this tender is highlighted
                                      const isHighlighted = group.tender.isHighlighted;
                                      
                                      // Determine if we should show the title based on width
                                      // Only show title if bar is wide enough (at least 120px)
                                      const showTitle = widthPx >= 120;

                                      return (
                                        <HoverCard key={`${group.tender.id}-${version.date}`} openDelay={0.1} closeDelay={0.1}>
                                          <HoverCardTrigger asChild>
                                            <button
                                              onClick={() => setSelectedTender(group)}
                                              className={cn(
                                                "absolute rounded-full transition-all group border-2",
                                                isHighlighted 
                                                  ? "border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]" // Highlight the tender bar
                                                  : "border-white",
                                                group.tender.isArchived && "opacity-75 line-through",
                                                "flex items-center justify-center text-sm",
                                                TYPE_COLORS[version.type as keyof typeof TYPE_COLORS] || TYPE_COLORS.default
                                              )}
                                              style={{
                                                left: `${Math.max(0, startPx)}px`,
                                                width: `${widthPx}px`,
                                                height: '26px',
                                                fontSize: `${Math.min(16, Math.max(8, 12 / zoomLevel)) * zoomLevel}px`,
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                transition: 'all 0.2s ease-in-out',
                                                opacity: isHighlighted ? 1 : opacity, // Full opacity for highlighted tenders
                                                zIndex: isHighlighted ? 50 : (10 + (group.versions.length - versionIndex)), // Higher z-index for highlighted tenders
                                                textDecoration: group.tender.isArchived ? 'line-through' : 'none',
                                              }}
                                            >
                                              {/* Only show text if bar is wide enough */}
                                              {showTitle && (
                                                <span className={cn(
                                                  "truncate text-center p-1",
                                                  group.tender.isArchived && "line-through opacity-70"
                                                )}>
                                                  {group.tender.title}
                                                </span>
                                              )}
                                            </button>
                                          </HoverCardTrigger>
                                          <HoverCardContent 
                                            className={cn(
                                              "w-auto max-w-[400px] p-3",
                                              "bg-white/95 backdrop-blur-sm dark:bg-gray-800/95",
                                              "border border-border/50 shadow-lg dark:border-gray-700",
                                              "rounded-lg",
                                              "animate-in fade-in-0 zoom-in-95",
                                              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                                            )}
                                            style={{ zIndex: 100 }}
                                            side="bottom" 
                                            align="center"
                                            sideOffset={5}
                                            avoidCollisions={true}
                                          >
                                            <div className="flex flex-col gap-2">
                                              <div className="flex items-center justify-between">
                                                <Badge 
                                                  className={cn(
                                                    TYPE_COLORS[version.type as keyof typeof TYPE_COLORS] || TYPE_COLORS.default,
                                                    "border-none hover:bg-transparent"
                                                  )}
                                                >
                                                  {version.type}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                  {format(parseTenderDate(dates.startDate), 'PPP')}
                                                </span>
                                              </div>
                                              <p className={cn(
                                                "text-sm font-medium leading-snug",
                                                group.tender.isArchived && "line-through opacity-70"
                                              )}>
                                                {group.tender.title}
                                              </p>
                                              {version.data?.detail?.['預算金額'] && (
                                                <p className="text-xs text-muted-foreground">
                                                  Budget: {version.data.detail['預算金額']}
                                                </p>
                                              )}
                                              {version.data?.detail?.['招標資料:招標狀態'] && (
                                                <p className="text-xs text-muted-foreground">
                                                  Status: {version.data.detail['招標資料:招標狀態']}
                                                </p>
                                              )}
                                            </div>
                                          </HoverCardContent>
                                        </HoverCard>
                                      );
                                    })}
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Right-side sheet for tender details 
       * @note Using Sheet instead of Dialog for better right-side panel behavior
       * @note Sheet has built-in right-side positioning and proper animations
       */}
      <Sheet 
        open={!!selectedTender} 
        onOpenChange={(open) => {
          console.log("Sheet state change:", { 
            open, 
            tenderId: selectedTender?.tender.id,
            action: open ? "opening" : "closing" 
          });
          if (!open) setSelectedTender(null);
        }}
      >
        <SheetContent 
          side="right"
          className={cn(
            "w-full mt-4 mr-4 mb-4 rounded-lg border",
            "p-0 bg-background shadow-lg dark:border-gray-800",
            "focus:outline-none",
            "h-[calc(100vh-32px)]"
          )}
        >
          {selectedTender && (
            <div className="h-full flex flex-col rounded-lg overflow-hidden">
              <SheetHeader className="px-6 py-4 shrink-0 max-w-[460px]">
                <SheetTitle className={cn(
                  "text-xl font-semibold",
                  selectedTender.tender.isArchived && "line-through opacity-70"
                )}>
                  {selectedTender.tender.title}
                </SheetTitle>
                <SheetDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">
                      {format(parseTenderDate(selectedTender.tender.startDate || selectedTender.tender.date), 'PPP')}
                    </Badge>
                    <span>→</span>
                    <Badge variant="outline">
                      {format(parseTenderDate(selectedTender.tender.endDate || selectedTender.tender.startDate || selectedTender.tender.date), 'PPP')}
                    </Badge>
                  </div>
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                <TabsList className="px-6 shrink-0 ">
                  <div className="w-full grid grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="versions">Versions</TabsTrigger>
                  </div>
                </TabsList>
                
                <div className="flex-1 overflow-y-auto">
                  <TabsContent 
                    value="overview" 
                    className="p-6 space-y-4 mt-0"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium">Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-blue-500 mr-2" />
                            <span>{selectedTender.tender.brief['招標資料:招標狀態'] || 'N/A'}</span>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium">Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <span>{selectedTender.tender.type || 'Unknown'}</span>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium">Budget</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <span>
                            {selectedTender.tender?.brief?.['採購資料:預算金額'] || 
                             selectedTender.tender?.brief?.['已公告資料:預算金額'] || 
                             'N/A'}
                          </span>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium">Duration</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <span>{selectedTender.tender?.brief?.['其他:履約期限'] || 'N/A'}</span>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-medium">Description</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {selectedTender.tender?.brief?.['採購資料:標的分類'] || 'No description available'}
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent 
                    value="details" 
                    className="p-6 mt-0"
                  >
                    {selectedTender.tender.brief && (
                      <ScrollArea className="h-[calc(100vh-250px)]">
                        <div className="max-w-[460px] space-y-6 pr-6">
                          {/* Basic Information */}
                          <Card>
                            <CardHeader className="pb-4">
                              <CardTitle className="text-base font-medium">Basic Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {[
                                  ['採購資料:標案名稱', 'Project Name'],
                                  ['採購資料:標的分類', 'Category'],
                                  ['採購資料:招標方式', 'Method'],
                                  ['採購資料:預算金額', 'Budget'],
                                  ['採購資料:標案案號', 'Project Number']
                                ].map(([key, label]) => (
                                  <div key={key} className="space-y-1.5">
                                    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
                                    <dd className="text-sm break-words">
                                      {selectedTender.tender.brief[key] || 'N/A'}
                                    </dd>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Timeline Information */}
                          <Card>
                            <CardHeader className="pb-4">
                              <CardTitle className="text-base font-medium">Timeline</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {[
                                  ['招標資料:公告日', 'Announcement Date'],
                                  ['領投開標:截止投標', 'Submission Deadline'],
                                  ['領投開標:開標時間', 'Opening Date'],
                                  ['其他:履約期限', 'Contract Duration']
                                ].map(([key, label]) => (
                                  <div key={key} className="space-y-1.5">
                                    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
                                    <dd className="text-sm break-words">
                                      {selectedTender.tender.brief[key] || 'N/A'}
                                    </dd>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Additional Details */}
                          <Card>
                            <CardHeader className="pb-4">
                              <CardTitle className="text-base font-medium">Additional Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {Object.entries(selectedTender.tender.brief)
                                  .filter(([key]) => !key.includes('機關資料:') && 
                                                   !key.includes('招標資料:') && 
                                                   !key.includes('領投開標:') &&
                                                   !key.includes('其他:'))
                                  .map(([key, value]) => (
                                    <div key={key} className="space-y-1.5">
                                      <dt className="text-sm font-medium text-muted-foreground">{key}</dt>
                                      <dd className="text-sm break-words whitespace-pre-wrap">
                                        {value || 'N/A'}
                                      </dd>
                                    </div>
                                  ))}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>
                  
                  <TabsContent 
                    value="versions" 
                    className="p-6 space-y-4 mt-0"
                  >
                    {selectedTender.versions?.map((version, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <Badge 
                              className={cn(
                                TYPE_COLORS[version.type as keyof typeof TYPE_COLORS] || TYPE_COLORS.default,
                                "border-none hover:bg-transparent"
                              )}
                            >
                              {version.type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(parseTenderDate(version.date), 'PPP')}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {version.data?.brief && (
                            <div className="grid gap-2">
                              {Object.entries(version.data.brief)
                                .filter(([key, value]) => value && typeof value === 'string')
                                .map(([key, value]) => (
                                  <div key={key} className="grid grid-cols-4 gap-6 text-sm">
                                    <span className="text-muted-foreground text-right">{key} :</span>
                                    <span className="col-span-3">{value as string}</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}