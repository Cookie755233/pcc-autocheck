"use client"

import { useSearchParams } from "next/navigation"
import { useState, useMemo, useEffect, useRef } from "react"
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
  "公開招標公告": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "公開招標更正公告": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  
  "經公開評選或公開徵求之限制性招標更正公告": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "限制性招標(經公開評選或公開徵求)公告": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "限制性招標(經公開評選或公開徵求)更正公告": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  
  "決標公告": "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  
  "無法決標公告": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  
  "default": "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
  "公開取得報價單或企劃書公告": "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
  "公開取得報價單或企劃書更正公告": "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
  "財物出租更正公告": "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
  "財務變賣公告": "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",

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
      startDate: '114/01/01',
      endDate: '114/5/31'
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [localTenders, setLocalTenders] = useState<TenderGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTender, setSelectedTender] = useState<TenderGroup | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Add refs for the intersections
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Helper function to safely parse dates
  function parseTenderDate(dateStr: string | number | undefined): Date {
    if (!dateStr) return new Date();
    
    try {
      // Handle ROC date format (e.g., "113/10/24")
      if (typeof dateStr === 'string' && dateStr.includes('/')) {
        const [year, month, day] = dateStr.split('/').map(Number);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          const date = new Date(year + 1911, month - 1, day);
          return isNaN(date.getTime()) ? new Date() : date;
        }
      }
      
      // Handle YYYYMMDD format
      const str = dateStr.toString();
      if (str.length === 8) {
        const year = parseInt(str.substring(0, 4));
        const month = parseInt(str.substring(4, 6)) - 1;
        const day = parseInt(str.substring(6, 8));
        const date = new Date(year, month, day);
        return isNaN(date.getTime()) ? new Date() : date;
      }

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
        
        const response = await fetch(`/api/tenders/views?userId=${user.id}`);
        if (!response.ok) throw new Error("Failed to fetch tenders");
        
        const data = await response.json();
        console.log("Fetched tenders:", data.length);
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

  // Group tenders by keywords with non-overlapping layout
  const timelineData = useMemo(() => {
    console.log("Creating timeline data...");
    const groupedTenders: Record<string, {
      tenders: TenderGroup[];
      rows: Array<{
        tenders: TenderGroup[];
        startDate: Date;
        endDate: Date;
      }>;
    }> = {};
    
    formattedTenders.forEach(group => {
      const keywords = Array.isArray(group.tender.tags) ? group.tender.tags : [];
      
      keywords.forEach(keyword => {
        if (!groupedTenders[keyword]) {
          groupedTenders[keyword] = {
            tenders: [],
            rows: []
          };
        }
        
        // Check if this tender is related to any existing tenders
        const relatedTenderRow = groupedTenders[keyword].rows.findIndex(row => 
          row.tenders.some(existingGroup => 
            existingGroup.tender.id === group.tender.id ||
            existingGroup.relatedTenders.some(related => related.id === group.tender.id)
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
        
        groupedTenders[keyword].tenders.push(group);
      });
    });
    
    return groupedTenders;
  }, [formattedTenders]);

  // Filter by selected date if any
  const filteredData = useMemo(() => {
    if (!selectedDate) return timelineData;

    const filtered: typeof timelineData = {};
    Object.entries(timelineData).forEach(([keyword, data]) => {
      const filteredTenders = data.tenders.filter(group => {
        const tenderDate = new Date(group.tender.date);
        return (
          tenderDate.getFullYear() === selectedDate.getFullYear() &&
          tenderDate.getMonth() === selectedDate.getMonth() &&
          tenderDate.getDate() === selectedDate.getDate()
        );
      });

      if (filteredTenders.length > 0) {
        filtered[keyword] = {
          ...data,
          tenders: filteredTenders
        };
      }
    });

    return filtered;
  }, [timelineData, selectedDate]);

  // Calculate timeline range based on tenders - MODIFIED to include future months
  const timelineRange = useMemo(() => {
    const today = new Date();
    const defaultStart = new Date(today.getFullYear() - 1, today.getMonth(), 1);
    const defaultEnd = today;

    try {
      const dates = formattedTenders
        .flatMap(group => {
          const startDate = parseTenderDate(group.tender.startDate);
          const endDate = parseTenderDate(group.tender.endDate);
          return [startDate, endDate];
        })
        .filter(date => date instanceof Date && !isNaN(date.getTime()));

      if (dates.length === 0) {
        console.log("No valid dates found, using default range", { start: defaultStart, end: defaultEnd });
        return { start: defaultStart, end: defaultEnd };
      }

      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      
      // Add extra months to the end based on zoom level
      // More zoomed out = more future months
      const extraMonths = Math.max(3, Math.round(6 / zoomLevel));
      const extendedEndDate = addMonths(maxDate, extraMonths);
      
      console.log("Timeline range calculated:", { 
        minDate: minDate.toISOString(),
        maxDate: maxDate.toISOString(),
        extendedEndDate: extendedEndDate.toISOString(),
        extraMonths,
        zoomLevel,
        numTenders: formattedTenders.length 
      });

      return { 
        start: minDate,
        end: extendedEndDate // Use extended end date
      };
    } catch (error) {
      console.error("Error calculating timeline range:", error);
      // Add future months to default end as well
      return { 
        start: defaultStart, 
        end: addMonths(defaultEnd, 3)
      };
    }
  }, [formattedTenders, zoomLevel]); // Added zoomLevel as dependency

  // Generate months array for the timeline
  const months = useMemo(() => {
    const result = [];
    let current = new Date(timelineRange.start);
    
    while (current <= timelineRange.end) {
      result.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }
    
    console.log("Generated months:", result.map(d => format(d, 'MMM yyyy')));
    return result;
  }, [timelineRange]);

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
      <div className="flex items-center justify-between sticky top-[64px] z-50">
        <h1 className="text-3xl font-bold">Timeline</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {format(timelineRange.start, 'MMM yyyy')} - {format(timelineRange.end, 'MMM yyyy')}
          </div>
          <div className="flex items-center gap-1 border rounded-lg p-1 bg-white/50">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 rounded-sm hover:bg-accent"
              onClick={() => {
                const newZoom = Math.max(0.5, zoomLevel - 0.25);
                console.log("Zoom out:", { oldZoom: zoomLevel, newZoom });
                setZoomLevel(newZoom);
              }}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="w-[1px] h-4 bg-border" />
            <Button 
              variant="ghost" 
              size="icon"
              className="h-7 w-7 hover:bg-accent"
              onClick={() => {
                const newZoom = Math.min(2, zoomLevel + 0.25);
                console.log("Zoom in:", { oldZoom: zoomLevel, newZoom });
                setZoomLevel(newZoom);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="border rounded-2xl overflow-hidden mt-10">
        {/* Month headers - Sticky with proper spacing */}
        <div className="sticky z-40 bg-background border-b">
          <div className="flex">
            <div className="w-[200px] shrink-0 font-medium sticky left-0 z-10 border-r bg-background">
              <div className="flex items-center justify-center h-[60px]">
                Keywords
              </div>
            </div>
            
            <div className="flex-1 overflow-x-auto">
              <div 
                className="flex"
                style={{ 
                  width: `${Math.max(1200, months.length * 100) * zoomLevel}px`,
                  transition: 'width 0.5s ease'
                }}
              >
                {months.map((date, i) => (
                  <div 
                    key={i} 
                    className="flex-1 font-medium p-4"
                    style={{ 
                      minWidth: `${100 * zoomLevel}px`,
                    }}
                  >
                    {zoomLevel < 0.75 ? (
                      <div className="text-center">
                        <div className="text-sm">{format(date, 'MMM')}</div>
                        {i === 0 || date.getMonth() === 0 ? (
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(date, 'yyyy')}
                          </div>
                        ) : null}
                      </div>
                    ) : (
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

        {/* Timeline content with dividers */}
        <div 
          ref={timelineContainerRef}
          className="relative max-h-[calc(100vh-250px)] overflow-y-auto backdrop-blur-xl backdrop-opacity-50 bg-white/50"
        >
          {Object.entries(timelineData).map(([keyword, data], index) => (
            <div 
              key={keyword}
              className={cn(
                "flex relative",
                index !== 0 && "border-t border-border/50"
              )}
              ref={el => sectionRefs.current[keyword] = el}
            >
              {/* Sticky keyword column - FIXED with proper sticky behavior */}
              <div className="w-[200px] shrink-0 sticky left-0 backdrop-blur-xl backdrop-opacity-50 bg-white/50 border-r">
                <div className="p-4 sticky top-0 transition-all">
                  <div className="font-medium text-end pr-4">{keyword}</div>
                  <div className="text-sm text-muted-foreground text-end pr-4">
                    {data.tenders.length} tenders
                  </div>
                </div>
              </div>

              {/* Timeline bars */}
              <div className="flex-1 backdrop-blur-xl backdrop-opacity-50 bg-white/50">
                {/* Add padding wrapper */}
                <div className="py-4">
                  {data.rows.map((row, rowIndex) => (
                    <div 
                      key={rowIndex}
                      className="relative h-10 last:border-b-0 hover:bg-accent/5"
                    >
                      {/* Center content vertically */}
                      <div className="absolute inset-x-0 h-full flex items-center">
                        <div className="w-full px-4">
                          {/* Tender bars container */}
                          <div className="relative h-full flex items-center">
                            {row.tenders.map(group => {
                              const startDate = parseTenderDate(group.tender.startDate) || new Date();
                              const endDate = parseTenderDate(group.tender.endDate) || new Date(startDate.getTime() + (30 * 24 * 60 * 60 * 1000));

                              const timelineStart = timelineRange.start.getTime();
                              const timelineEnd = timelineRange.end.getTime();
                              const totalDuration = timelineEnd - timelineStart;
                              
                              const left = ((startDate.getTime() - timelineStart) / totalDuration) * 100;
                              const width = ((endDate.getTime() - startDate.getTime()) / totalDuration) * 100;

                              return (
                                <HoverCard key={group.tender.id} openDelay={0.1} closeDelay={0.1}>
                                  <HoverCardTrigger asChild>
                                    <button
                                      onClick={() => setSelectedTender(group)}
                                      className={cn(
                                        "absolute rounded-full transition-all group",
                                        "flex items-center justify-center text-sm",
                                        TYPE_COLORS[group.tender.type as keyof typeof TYPE_COLORS] || TYPE_COLORS.default,
                                        group.tender.isHighlighted && "shadow-[0px_0px_5px_3px_rgba(250,204,21,0.5)] border-yellow-400 ring-1 ring-yellow-400"
                                      )}
                                      style={{
                                        left: `${Math.max(0, Math.min(left, 100))}%`,
                                        width: `${Math.max(8, Math.min(width, 100 - left))}%`,
                                        height: '26px',
                                        fontSize: `${Math.min(16, Math.max(8, 12 / zoomLevel)) * zoomLevel}px`,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        transition: 'all 0.2s ease-in-out'
                                      }}
                                    >
                                      <span className="truncate text-center p-1">
                                        {group.tender.title}
                                      </span>
                                    </button>
                                  </HoverCardTrigger>
                                  <HoverCardContent 
                                    className={cn(
                                      "w-auto max-w-[400px] p-3",
                                      "bg-white/95 backdrop-blur-sm",
                                      "border border-border/50 shadow-lg",
                                      "rounded-lg",
                                      "animate-in fade-in-0 zoom-in-95",
                                      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                                    )}
                                    side="top" 
                                    align="center"
                                    sideOffset={5}
                                    avoidCollisions={true}
                                  >
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <Badge 
                                          variant="secondary"
                                          className={cn(
                                            "h-6 px-2 text-xs font-normal",
                                            TYPE_COLORS[group.tender.type as keyof typeof TYPE_COLORS] || TYPE_COLORS.default
                                          )}
                                        >
                                          {group.tender.type}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                          {format(parseTenderDate(group.tender.startDate), 'PPP')}
                                        </span>
                                      </div>
                                      <p className="text-sm font-medium leading-snug">
                                        {group.tender.title}
                                      </p>
                                      {group.tender.brief?.['預算金額'] && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Budget: {group.tender.brief['預算金額']}
                                        </p>
                                      )}
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
            "p-0 bg-background shadow-lg",
            "focus:outline-none",
            "h-[calc(100vh-32px)]"
          )}
        >
          {selectedTender && (
            <div className="h-full flex flex-col rounded-lg overflow-hidden">
              <SheetHeader className="px-6 py-4 border-b shrink-0">
                <SheetTitle className="text-xl font-semibold">
                  {selectedTender.tender.title}
                </SheetTitle>
                <SheetDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">
                      {format(parseTenderDate(selectedTender.tender.startDate), 'PPP')}
                    </Badge>
                    <span>→</span>
                    <Badge variant="outline">
                      {format(parseTenderDate(selectedTender.tender.endDate || selectedTender.tender.startDate), 'PPP')}
                    </Badge>
                  </div>
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                <TabsList className="px-6 border-b shrink-0">
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
                          <CardTitle className="text-sm font-medium">Status</CardTitle>
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
                          <CardTitle className="text-sm font-medium">Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Badge>{selectedTender.tender.type}</Badge>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Budget</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <span className="text-lg font-semibold">
                            {selectedTender.tender.brief['預算金額'] || 'N/A'}
                          </span>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Duration</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <span>{selectedTender.tender.brief['其他:履約期限'] || 'N/A'}</span>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Description</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {selectedTender.tender.brief['採購資料:標的分類'] || 'No description available'}
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  {/* TODO */}
                  <TabsContent 
                    value="details" 
                    className="p-6 space-y-4 mt-0"
                  >
                    {selectedTender.tender.brief && (
                      <div className="space-y-6">
                        {/* Basic Information */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Basic Information</CardTitle>
                          </CardHeader>
                          <CardContent className="grid gap-4">
                            {[
                              ['採購資料:標案名稱', 'Project Name'],
                              ['採購資料:標的分類', 'Category'],
                              ['採購資料:招標方式', 'Method'],
                              ['採購資料:預算金額', 'Budget'],
                              ['採購資料:標案案號', 'Project Number']
                            ].map(([key, label]) => (
                              <div key={key} className="grid grid-cols-4 gap-4">
                                <span className="text-sm font-medium text-right">{label}</span>
                                <span className="col-span-3 text-sm">
                                  {selectedTender.tender.brief[key] || 'N/A'}
                                </span>
                              </div>
                            ))}
                          </CardContent>
                        </Card>

                        {/* Timeline Information */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Timeline</CardTitle>
                          </CardHeader>
                          <CardContent className="grid gap-4">
                            {[
                              ['招標資料:公告日', 'Announcement Date'],
                              ['領投開標:截止投標', 'Submission Deadline'],
                              ['領投開標:開標時間', 'Opening Date'],
                              ['其他:履約期限', 'Contract Duration']
                            ].map(([key, label]) => (
                              <div key={key} className="grid grid-cols-4 gap-4">
                                <span className="text-sm font-medium text-right">{label}</span>
                                <span className="col-span-3 text-sm">
                                  {selectedTender.tender.brief[key] || 'N/A'}
                                </span>
                              </div>
                            ))}
                          </CardContent>
                        </Card>

                        {/* Additional Details */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Additional Details</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-4">
                              {Object.entries(selectedTender.tender.brief)
                                .filter(([key]) => !key.includes('機關資料:') && 
                                                 !key.includes('招標資料:') && 
                                                 !key.includes('領投開標:') &&
                                                 !key.includes('其他:'))
                                .map(([key, value]) => (
                                  <div key={key} className="grid grid-cols-4 gap-4">
                                    <span className="text-sm font-medium text-right">{key}</span>
                                    <span className="col-span-3 text-sm">{value || 'N/A'}</span>
                                  </div>
                                ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent 
                    value="versions" 
                    className="p-6 space-y-4 mt-0"
                  >
                    {selectedTender.tender.versions.map((version, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <Badge 
                              className={cn(
                                TYPE_COLORS[version.type as keyof typeof TYPE_COLORS] || TYPE_COLORS.default,
                                "border-none"
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