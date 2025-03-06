"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TenderGroup } from "@/types/tender";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/components/ui/use-toast";
import { format, addMonths } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Minus,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart } from "lucide-react";

// Add color mapping for different tender types
const TYPE_COLORS = {
  公開招標公告:
    "bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-200",
  公開招標更正公告:
    "bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-200",

  經公開評選或公開徵求之限制性招標公告:
    "bg-orange-100 text-orange-700 dark:bg-orange-800/40 dark:text-orange-200",
  經公開評選或公開徵求之限制性招標更正公告:
    "bg-orange-100 text-orange-700 dark:bg-orange-800/40 dark:text-orange-200",
  "限制性招標(經公開評選或公開徵求)公告":
    "bg-orange-100 text-orange-700 dark:bg-orange-800/40 dark:text-orange-200",
  "限制性招標(經公開評選或公開徵求)更正公告":
    "bg-orange-100 text-orange-700 dark:bg-orange-800/40 dark:text-orange-200",

  決標公告: "bg-sky-100 text-sky-700 dark:bg-sky-800/40 dark:text-sky-200",

  無法決標公告:
    "bg-rose-100 text-rose-700 dark:bg-rose-800/40 dark:text-rose-200",

  default: "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-200",
  公開取得報價單或企劃書公告:
    "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-200",
  公開取得報價單或企劃書更正公告:
    "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-200",
  財物出租更正公告:
    "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-200",
  財務變賣公告:
    "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-200",
} as const;

// Helper function to safely parse dates
function parseTenderDate(dateStr: string | number | undefined): Date {
  if (!dateStr) return new Date();

  try {
    //! Debug log for date parsing
    // console.log("Parsing date:", dateStr);

    // Handle ROC date format (e.g., "113/10/24" or "113/1/1 17:00")
    if (typeof dateStr === "string") {
      // Check for ROC date format with optional time
      const rocDateTimeRegex =
        /^(\d{1,3})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?$/;
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
        // console.log(`Parsed YYYYMMDD date: ${dateStr} → ${date.toISOString()}`);
        return isNaN(date.getTime()) ? new Date() : date;
      }

      // Handle ISO date strings
      if (dateStr.includes("T") || dateStr.includes("-")) {
        try {
          const date = new Date(dateStr);
          // console.log(`Parsed ISO date: ${dateStr} → ${date.toISOString()}`);
          return isNaN(date.getTime()) ? new Date() : date;
        } catch (error) {
          console.error("Failed to parse ISO date:", dateStr, error);
        }
      }
    }

    // Handle number (timestamp)
    if (typeof dateStr === "number") {
      // Check if it's a timestamp (milliseconds since epoch)
      if (dateStr > 1000000000000) {
        // Likely a JS timestamp (milliseconds)
        const date = new Date(dateStr);
        // console.log(`Parsed timestamp (ms): ${dateStr} → ${date.toISOString()}`);
        return isNaN(date.getTime()) ? new Date() : date;
      }

      // Check if it's a YYYYMMDD format number
      if (dateStr >= 19000101 && dateStr <= 21000101) {
        const dateString = dateStr.toString();
        const year = parseInt(dateString.substring(0, 4));
        const month = parseInt(dateString.substring(4, 6)) - 1;
        const day = parseInt(dateString.substring(6, 8));
        const date = new Date(year, month, day);
        // console.log(`Parsed YYYYMMDD number: ${dateStr} → ${date.toISOString()}`);
        return isNaN(date.getTime()) ? new Date() : date;
      }

      // Assume it's a Unix timestamp (seconds since epoch)
      const date = new Date(dateStr * 1000);
      // console.log(`Parsed timestamp (s): ${dateStr} → ${date.toISOString()}`);
      return isNaN(date.getTime()) ? new Date() : date;
    }

    // If all else fails, return current date
    console.warn("Could not parse date, using current date:", dateStr);
    return new Date();
  } catch (error) {
    console.error("Error parsing date:", dateStr, error);
    return new Date();
  }
}

// Function to extract dates from tender versions
function getTenderDates(version: any) {
  const detail = version?.data?.detail || {};
  const type = version?.type || "";
  const startDate = version?.date;

  // Default end date is undefined, not a future date
  let endDate = undefined;

  if (type.includes("招標")) {
    endDate = detail["領投開標:截止投標"];
    return {
      startDate: detail["招標資料:公告日"] || startDate,
      endDate: endDate,
    };
  }
  if (type.includes("決標")) {
    endDate = detail["決標資料:決標公告日期"];
    return {
      startDate: detail["已公告資料:原公告日期"] || startDate,
      endDate: endDate,
    };
  }
  if (type.includes("無法決標")) {
    endDate = detail["無法決標公告:無法決標公告日期"];
    return {
      startDate:
        detail["無法決標公告:原招標公告之刊登採購公報日期"] || startDate,
      endDate: endDate,
    };
  }
  if (type.includes("出租")) {
    endDate = detail["標案內容:截標時間"];
    return {
      startDate: startDate || detail["標案內容:截標時間"],
      endDate: endDate,
    };
  }

  //? Default fall-through - only use the date we know is valid
  return {
    startDate: startDate,
    endDate: undefined,
  };
}

export default function StatisticsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [localTenders, setLocalTenders] = useState<TenderGroup[]>([]);
  const [userKeywords, setUserKeywords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTender, setSelectedTender] = useState<TenderGroup | null>(
    null
  );
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState<"months" | "years">("months");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showHighlightedOnly, setShowHighlightedOnly] = useState(false);
  const [showDeprecatedTenders, setShowDeprecatedTenders] = useState(false);

  // Add refs for the intersections
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const monthHeadersRef = useRef<HTMLDivElement>(null);
  const timelineContentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch tenders from the database
  useEffect(() => {
    async function fetchTenders() {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        console.log("Fetching tenders for statistics view...");

        // Fetch tenders
        const tenderResponse = await fetch(
          `/api/tenders/views?userId=${user.id}`
        );
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

    //? First filter tenders by active keywords to avoid unnecessary processing
    const activeTenders: TenderGroup[] = [];
    const deprecatedTenders: TenderGroup[] = [];

    localTenders.forEach((group) => {
      //@ Check if tender matches any active keyword
      const tenderTitle = group.tender.title?.toLowerCase() || "";
      const tenderType = group.tender.type?.toLowerCase() || "";
      const tenderBrief = JSON.stringify(
        group.tender.brief || {}
      ).toLowerCase();

      const matchesActiveKeyword = userKeywords.some((keyword) => {
        const lowercaseKeyword = keyword.toLowerCase();
        return (
          tenderTitle.includes(lowercaseKeyword) ||
          tenderType.includes(lowercaseKeyword) ||
          tenderBrief.includes(lowercaseKeyword)
        );
      });

      if (matchesActiveKeyword) {
        activeTenders.push(group);
      } else {
        deprecatedTenders.push(group);
      }
    });

    console.log("Filtered tenders:", {
      activeTendersCount: activeTenders.length,
      deprecatedTendersCount: deprecatedTenders.length,
    });

    //@ Only process active tenders for the timeline - We'll handle deprecated tenders separately
    const tendersToProcess = activeTenders;

    const formatted = tendersToProcess.map((group) => {
      const versions = group.versions || [];
      const latestVersion = versions[versions.length - 1];
      const dates = getTenderDates(latestVersion);

      const tender = {
        ...group.tender,
        title:
          latestVersion?.data?.detail?.["採購資料:標案名稱"] ||
          group.tender.title ||
          "No title",
        startDate: dates.startDate,
        endDate: dates.endDate,
        type: latestVersion?.type || "default",
        brief: latestVersion?.data?.detail || {},
        versions: versions,
        isDeprecated: false, // These are all active tenders
      };

      console.log("Processed tender:", {
        id: tender.id,
        title: tender.title,
        type: tender.type,
        startDate: tender.startDate,
        endDate: tender.endDate,
        isDeprecated: tender.isDeprecated,
      });

      return { tender, versions, relatedTenders: group.relatedTenders || [] };
    });

    return formatted;
  }, [localTenders, userKeywords]); // Remove showDeprecatedTenders dependency

  // Handle deprecated tenders separately
  const formattedDeprecatedTenders = useMemo(() => {
    if (!showDeprecatedTenders) return [];

    //@ Find tenders that don't match any active keywords
    const deprecatedGroups = localTenders.filter((group) => {
      const tenderTitle = group.tender.title?.toLowerCase() || "";
      const tenderType = group.tender.type?.toLowerCase() || "";
      const tenderBrief = JSON.stringify(
        group.tender.brief || {}
      ).toLowerCase();

      return !userKeywords.some((keyword) => {
        const lowercaseKeyword = keyword.toLowerCase();
        return (
          tenderTitle.includes(lowercaseKeyword) ||
          tenderType.includes(lowercaseKeyword) ||
          tenderBrief.includes(lowercaseKeyword)
        );
      });
    });

    return deprecatedGroups.map((group) => {
      const versions = group.versions || [];
      const latestVersion = versions[versions.length - 1];
      const dates = getTenderDates(latestVersion);

      const tender = {
        ...group.tender,
        title:
          latestVersion?.data?.detail?.["採購資料:標案名稱"] ||
          group.tender.title ||
          "No title",
        startDate: dates.startDate,
        endDate: dates.endDate,
        type: latestVersion?.type || "default",
        brief: latestVersion?.data?.detail || {},
        versions: versions,
        isDeprecated: true, // These are deprecated tenders
      };

      return { tender, versions, relatedTenders: group.relatedTenders || [] };
    });
  }, [localTenders, userKeywords, showDeprecatedTenders]);

  //@ Count of all deprecated tenders (even when not shown)
  const deprecatedTendersCount = useMemo(() => {
    // Get all tenders that match any active keyword
    const activeTenderIds = new Set<string>();

    userKeywords.forEach((keyword) => {
      const lowercaseKeyword = keyword.toLowerCase();
      localTenders.forEach((group) => {
        const tenderTitle = group.tender.title?.toLowerCase() || "";
        const tenderType = group.tender.type?.toLowerCase() || "";
        const tenderBrief = JSON.stringify(
          group.tender.brief || {}
        ).toLowerCase();

        if (
          tenderTitle.includes(lowercaseKeyword) ||
          tenderType.includes(lowercaseKeyword) ||
          tenderBrief.includes(lowercaseKeyword)
        ) {
          activeTenderIds.add(group.tender.id);
        }
      });
    });

    // Count tenders that don't match any active keyword
    const deprecatedCount = localTenders.filter(
      (group) => !activeTenderIds.has(group.tender.id)
    ).length;

    return deprecatedCount;
  }, [localTenders, userKeywords]);

  // Get the list of available tender types from the actual data
  const availableTenderTypes = useMemo(() => {
    //@ Extract unique tender types from the current data
    const typeSet = new Set<string>();

    formattedTenders.forEach((group) => {
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
    const groupedTenders: Record<
      string,
      {
        tenders: TenderGroup[];
        rows: Array<{
          tenders: TenderGroup[];
          startDate: Date;
          endDate: Date;
        }>;
      }
    > = {};

    // Initialize groupedTenders with user's keywords
    userKeywords.forEach((keyword) => {
      groupedTenders[keyword] = {
        tenders: [],
        rows: [],
      };
    });

    // Now match tenders to keywords
    formattedTenders.forEach((group) => {
      // Get the title and other searchable fields from the tender
      const tenderTitle = group.tender.title?.toLowerCase() || "";
      const tenderType = group.tender.type?.toLowerCase() || "";
      const tenderBrief = JSON.stringify(
        group.tender.brief || {}
      ).toLowerCase();

      // Check which of the user's keywords match this tender
      userKeywords.forEach((keyword) => {
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
          const relatedTenderRow = groupedTenders[keyword].rows.findIndex(
            (row) =>
              row.tenders.some(
                (existingGroup) =>
                  existingGroup.tender.id === group.tender.id ||
                  existingGroup.relatedTenders?.some(
                    (related) => related.id === group.tender.id
                  )
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
              endDate: parseTenderDate(group.tender.endDate),
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
      totalTenders: Object.values(filteredGroupedTenders).reduce(
        (sum, data) => sum + data.tenders.length,
        0
      ),
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
      rawDataCount: formattedTenders.length,
    });

    // Only apply date filter if a date is explicitly selected
    if (selectedDate) {
      const dateFiltered: typeof timelineData = {};
      Object.entries(timelineData).forEach(([keyword, data]) => {
        const filteredTenders = data.tenders.filter((group) => {
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
            tenders: filteredTenders,
          };
        }
      });
      filtered = dateFiltered;
    }

    // Type filter
    if (typeFilter) {
      const typeFiltered: typeof timelineData = {};
      Object.entries(filtered).forEach(([keyword, data]) => {
        const filteredTenders = data.tenders.filter((group) => {
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
          const filteredRows = data.rows
            .map((row) => {
              // Keep only tenders that match the type filter
              const filteredRowTenders = row.tenders.filter((group) => {
                try {
                  const latestVersion =
                    group.versions[group.versions.length - 1];
                  return latestVersion?.type === typeFilter;
                } catch (error) {
                  console.error("Error filtering row tenders:", error);
                  return false; // Skip items with invalid type
                }
              });

              return {
                ...row,
                tenders: filteredRowTenders,
              };
            })
            .filter((row) => row.tenders.length > 0); // Remove empty rows

          typeFiltered[keyword] = {
            tenders: filteredTenders,
            rows: filteredRows,
          };
        }
      });
      filtered = typeFiltered;
    }

    // Highlighted filter
    if (showHighlightedOnly) {
      const highlightedFiltered: typeof timelineData = {};
      Object.entries(filtered).forEach(([keyword, data]) => {
        const filteredTenders = data.tenders.filter(
          (group) => group.tender.isHighlighted === true
        );

        if (filteredTenders.length > 0) {
          // Filter rows to only include highlighted tenders
          const filteredRows = data.rows
            .map((row) => {
              const filteredRowTenders = row.tenders.filter(
                (group) => group.tender.isHighlighted === true
              );
              return {
                ...row,
                tenders: filteredRowTenders,
              };
            })
            .filter((row) => row.tenders.length > 0); // Remove empty rows

          highlightedFiltered[keyword] = {
            tenders: filteredTenders,
            rows: filteredRows,
          };
        }
      });
      filtered = highlightedFiltered;
    }

    console.log("Filter results:", {
      keywordCount: Object.keys(filtered).length,
      totalTenders: Object.values(filtered).reduce(
        (sum, data) => sum + data.tenders.length,
        0
      ),
      hasTenders: Object.keys(filtered).length > 0,
    });

    return filtered;
  }, [
    timelineData,
    selectedDate,
    typeFilter,
    showHighlightedOnly,
    formattedTenders.length,
  ]);

  // Calculate timeline range based on tenders - MODIFIED to ensure all tenders are visible
  const timelineRange = useMemo(() => {
    const today = new Date();
    const maxAllowedDate = addMonths(today, 6); // No tender should be more than 6 months in the future

    try {
      // First gather all dates from tenders to determine the full timeline range
      const dates: Date[] = [];

      formattedTenders.forEach((group) => {
        // Get dates from the tender
        let startDate = null;
        let endDate = null;

        if (group.tender.startDate) {
          startDate = parseTenderDate(group.tender.startDate);
        }

        if (group.tender.endDate) {
          endDate = parseTenderDate(group.tender.endDate);
        }

        // Only add valid dates that aren't too far in the future
        if (
          startDate instanceof Date &&
          !isNaN(startDate.getTime()) &&
          startDate < maxAllowedDate
        ) {
          dates.push(startDate);
          // console.log(`Valid start date for tender ${group.tender.id}: ${startDate.toISOString()}`);
        } else if (startDate instanceof Date && startDate >= maxAllowedDate) {
          console.warn(
            `Ignoring suspiciously future date for tender ${
              group.tender.id
            }: ${startDate.toISOString()}`
          );
        }

        if (
          endDate instanceof Date &&
          !isNaN(endDate.getTime()) &&
          endDate < maxAllowedDate
        ) {
          dates.push(endDate);
          // console.log(`Valid end date for tender ${group.tender.id}: ${endDate.toISOString()}`);
        } else if (endDate instanceof Date && endDate >= maxAllowedDate) {
          console.warn(
            `Ignoring suspiciously future date for tender ${
              group.tender.id
            }: ${endDate.toISOString()}`
          );
        }
      });

      // Debug log all collected dates
      console.log(`Collected ${dates.length} valid dates for timeline range`);

      // If we have valid dates, use them to determine the full range
      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

        // Add extra months to the end based on zoom level
        const extraMonths = Math.max(3, Math.round(6 / zoomLevel));
        const extendedEndDate = addMonths(maxDate, extraMonths);

        console.log("Full timeline range from all tenders:", {
          minDate: minDate.toISOString(),
          maxDate: maxDate.toISOString(),
          extendedEndDate: extendedEndDate.toISOString(),
        });

        return {
          start: minDate,
          end: extendedEndDate,
          defaultViewStart: new Date(
            today.getFullYear() - 1,
            today.getMonth(),
            today.getDate()
          ), // For initial scroll
          defaultViewEnd: today, // For initial scroll
        };
      }

      // Fallback if no tenders with valid dates
      const defaultStart = new Date(
        today.getFullYear() - 2,
        today.getMonth(),
        1
      ); // Further back for empty state
      const defaultEnd = addMonths(today, 3);

      console.log("Using default timeline range:", {
        start: defaultStart.toISOString(),
        end: defaultEnd.toISOString(),
      });

      return {
        start: defaultStart,
        end: defaultEnd,
        defaultViewStart: new Date(
          today.getFullYear() - 1,
          today.getMonth(),
          today.getDate()
        ),
        defaultViewEnd: today,
      };
    } catch (error) {
      console.error("Error calculating timeline range:", error);

      // Safe fallback
      const defaultStart = new Date(
        today.getFullYear() - 2,
        today.getMonth(),
        1
      );
      const defaultEnd = addMonths(today, 3);

      return {
        start: defaultStart,
        end: defaultEnd,
        defaultViewStart: new Date(
          today.getFullYear() - 1,
          today.getMonth(),
          today.getDate()
        ),
        defaultViewEnd: today,
      };
    }
  }, [formattedTenders, zoomLevel]);

  // Generate months array for the timeline
  const months = useMemo(() => {
    const result = [];
    let current = new Date(timelineRange.start);

    if (viewMode === "years") {
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

    console.log(
      `Generated ${viewMode}:`,
      result.map((d) =>
        viewMode === "years" ? format(d, "yyyy") : format(d, "MMM yyyy")
      )
    );

    return result;
  }, [timelineRange, viewMode]);

  // Update row height and set up sticky effects
  useEffect(() => {
    console.log("Timeline layout:", {
      zoomLevel,
      contentWidth: `${1200 * zoomLevel}px`,
      timelineRange: {
        start: timelineRange.start.toISOString(),
        end: timelineRange.end.toISOString(),
      },
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
    monthHeadersEl.addEventListener("scroll", syncScroll, { passive: true });
    timelineContentEl.addEventListener("scroll", syncScroll, { passive: true });

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
        const existingLines = container.querySelectorAll(".month-grid-line");
        existingLines.forEach((line) => line.remove());

        // Add new grid lines at month boundaries
        const monthWidth = 100 * zoomLevel;
        months.forEach((_, i) => {
          const line = document.createElement("div");
          line.className =
            "month-grid-line absolute top-0 bottom-0 pointer-events-none";
          line.style.left = `${i * monthWidth}px`;
          line.style.height = "100%";
          line.style.zIndex = "1";
          line.style.backgroundColor = "transparent"; // Make the line transparent
          container.appendChild(line);
        });
      } catch (error) {
        console.error("Error adding grid lines:", error);
      }
    };

    // Add grid lines after a short delay
    const gridLinesTimeoutId = setTimeout(addGridLines, 200);

    return () => {
      monthHeadersEl.removeEventListener("scroll", syncScroll);
      timelineContentEl.removeEventListener("scroll", syncScroll);
      clearTimeout(timeoutId);
      clearTimeout(gridLinesTimeoutId);
    };
  }, [months, zoomLevel]);

  // Set initial scroll position to show the default view (past year)
  useEffect(() => {
    // Wait for timeline to be fully rendered
    const timeoutId = setTimeout(() => {
      try {
        if (
          !monthHeadersRef.current ||
          !timelineContentRef.current ||
          !timelineRange.defaultViewStart
        )
          return;

        // Calculate the position to scroll to (to show the default view)
        const timelineStartTime = timelineRange.start.getTime();
        const defaultViewStartTime = timelineRange.defaultViewStart.getTime();
        const totalTimelineMs = timelineRange.end.getTime() - timelineStartTime;

        // Calculate the percentage through the timeline
        const scrollPercentage =
          (defaultViewStartTime - timelineStartTime) / totalTimelineMs;

        // Get the total scrollable width
        const totalWidth =
          monthHeadersRef.current.scrollWidth -
          monthHeadersRef.current.clientWidth;

        // Calculate scroll position
        const scrollPosition = Math.max(
          0,
          Math.floor(scrollPercentage * totalWidth)
        );

        console.log("Setting initial scroll position:", {
          scrollPercentage,
          scrollPosition,
          totalWidth,
          defaultViewStart: timelineRange.defaultViewStart.toISOString(),
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
    const type = tender.type || "default";
    const startDate = tender.startDate;
    const endDate = tender.endDate || startDate;

    return {
      title: tender.title || "Untitled Tender",
      type,
      brief,
      startDate,
      endDate,
    };
  };

  // Extract deprecated tenders that aren't displayed in the main timeline
  const deprecatedTenders = useMemo(() => {
    if (!showDeprecatedTenders) return [];

    //@ Get tenders that match deprecated keywords (not in active userKeywords)
    return formattedTenders.filter((group) => group.tender.isDeprecated);
  }, [formattedTenders, showDeprecatedTenders]);

  //@ Get all unique keywords found in deprecated tenders
  const deprecatedKeywords = useMemo(() => {
    if (!showDeprecatedTenders || deprecatedTenders.length === 0) return [];

    const keywords = new Set<string>();
    const allUserKeywords = userKeywords.map((k) => k.toLowerCase());

    //? Iterate through each deprecated tender's title and find potential keywords
    deprecatedTenders.forEach((group) => {
      const title = group.tender.title?.toLowerCase() || "";

      //? Check what words could be keywords that are not in the active keywords
      //? This is a simple heuristic - we extract words that might have been keywords
      const words = title
        .split(/\s+/)
        .filter(
          (word: string) => word.length > 2 && !allUserKeywords.includes(word)
        );

      words.forEach((word: string) => keywords.add(word));
    });

    return Array.from(keywords);
  }, [deprecatedTenders, userKeywords, showDeprecatedTenders]);

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
    <div className="flex flex-col min-h-screen">
      {/* Fixed header - Always visible at the top */}
      <div className="sticky top-[64px] z-50 pt-2">
        <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Tender Timeline</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {format(timelineRange.start, "MMM yyyy")} -{" "}
              {format(timelineRange.end, "MMM yyyy")}
            </div>

            {/* View mode toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "months" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-8"
                onClick={() => setViewMode("months")}
              >
                Months
              </Button>
              <div className="w-[1px] h-4 bg-border" />
              <Button
                variant={viewMode === "years" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-8"
                onClick={() => setViewMode("years")}
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
                  className="h-6 w-6"
                  onClick={() =>
                    setZoomLevel((prev) => Math.max(0.5, prev - 0.1))
                  }
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="w-12 text-center text-xs">
                  {Math.round(zoomLevel * 100)}%
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() =>
                    setZoomLevel((prev) => Math.min(2, prev + 0.1))
                  }
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              {/* Type filter */}
              <Select
                value={typeFilter || "all"}
                onValueChange={(value) =>
                  setTypeFilter(value === "all" ? null : value)
                }
              >
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {availableTenderTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Show highlighted only */}
              <Button
                variant={showHighlightedOnly ? "default" : "outline"}
                size="sm"
                className="h-8"
                onClick={() => setShowHighlightedOnly(!showHighlightedOnly)}
              >
                {showHighlightedOnly ? "Highlighted Only" : "Show Highlighted"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-grow overflow-auto">
        <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-60">
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div>
                  <Skeleton className="w-32 h-6" />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Timeline visualization */}
              <Card className="shadow-md dark:shadow-primary/5 overflow-hidden">
                {Object.keys(filteredData).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="rounded-full bg-muted p-6 mb-4">
                      <LineChart className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      No tenders to display
                    </h3>
                    <p className="text-muted-foreground max-w-md mb-6">
                      {typeFilter
                        ? `No tenders match the filter "${typeFilter}". Try selecting a different type.`
                        : showHighlightedOnly
                        ? "No highlighted tenders found. Try disabling the highlight filter."
                        : "Your timeline is empty. Add keywords and search for tenders in the dashboard to populate your timeline."}
                    </p>
                    {(typeFilter || showHighlightedOnly) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setTypeFilter(null);
                          setShowHighlightedOnly(false);
                        }}
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                ) : (
                  /* Main timeline container with horizontal scrolling */
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
                            scrollbarWidth: "none", // Firefox
                          }}
                        >
                          <div
                            className="flex"
                            style={{
                              width: `${
                                Math.max(
                                  1200,
                                  months.length *
                                    (viewMode === "years" ? 200 : 100)
                                ) * zoomLevel
                              }px`,
                              minWidth: "100%",
                              transition: "width 0.5s ease",
                              border: "none", // Ensure no borders are applied
                              backgroundColor: "transparent", // Ensure no background to avoid visual separation
                            }}
                          >
                            {months.map((date, i) => (
                              <div
                                key={i}
                                className="font-medium p-4"
                                style={{
                                  width: `${
                                    (viewMode === "years" ? 200 : 100) *
                                    zoomLevel
                                  }px`,
                                  minWidth: `${
                                    (viewMode === "years" ? 200 : 100) *
                                    zoomLevel
                                  }px`,
                                  border: "none", // Explicitly remove borders from each month div
                                  backgroundColor: "transparent", // Ensure transparent background
                                }}
                              >
                                {viewMode === "years" ? (
                                  <div className="text-center text-base font-semibold">
                                    {format(date, "yyyy")}
                                  </div>
                                ) : zoomLevel < 0.75 ? (
                                  <div className="text-center">
                                    <div className="text-sm">
                                      {format(date, "MMM")}
                                    </div>
                                    {i === 0 || date.getMonth() === 0 ? (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {format(date, "yyyy")}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : (
                                  <div className="text-sm">
                                    {format(date, "MMM yyyy")}
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
                        if (
                          monthHeadersRef.current &&
                          timelineContentRef.current
                        ) {
                          monthHeadersRef.current.scrollLeft =
                            timelineContentRef.current.scrollLeft;
                        }
                      }}
                    >
                      <div className="flex">
                        {/* Fixed keyword column */}
                        <div className="w-[200px] shrink-0 sticky left-0 z-40 bg-background/90 backdrop-blur-sm border-r-2 dark:border-gray-800 dark:bg-gray-900/50">
                          {Object.entries(filteredData).map(
                            ([keyword, data], index) => {
                              return (
                                <div
                                  key={keyword}
                                  className="border-b border-border dark:border-gray-800"
                                  ref={(el) => {
                                    sectionRefs.current[keyword] = el;
                                  }}
                                >
                                  {data.rows.length === 0 ? (
                                    // Empty row to match the timeline row
                                    <div className="h-[60px] flex items-center px-4 group">
                                      <div className="w-full space-y-1">
                                        <div className="font-medium text-end relative group">
                                          <span className="inline-block max-w-[180px] truncate">
                                            {keyword}
                                          </span>
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
                                      <div
                                        key={`${keyword}-row-${rowIndex}`}
                                        className="h-[60px] flex items-center px-4 group"
                                      >
                                        {rowIndex === 0 && (
                                          <div className="w-full space-y-1">
                                            <div className="font-medium text-end relative group">
                                              <span className="inline-block max-w-[180px] truncate">
                                                {keyword}
                                              </span>
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
                            }
                          )}
                        </div>

                        {/* Scrollable timeline content */}
                        <div
                          ref={timelineContentRef}
                          className="overflow-x-auto scrollbar-hide"
                          style={{
                            maxWidth: "calc(100% - 220px)", // Match exactly with the keyword column width
                            scrollbarWidth: "none", // Firefox
                          }}
                        >
                          <div
                            ref={timelineContainerRef}
                            style={{
                              width: `${
                                Math.max(
                                  1200,
                                  months.length *
                                    (viewMode === "years" ? 200 : 100)
                                ) * zoomLevel
                              }px`,
                              minWidth: "100%",
                              transition: "width 0.5s ease",
                            }}
                          >
                            {/* Timeline rows */}
                            {Object.entries(filteredData).map(
                              ([keyword, data], keywordIndex) => (
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
                                          {row.tenders.map((group) => (
                                            <React.Fragment
                                              key={group.tender.id}
                                            >
                                              {group.versions.map(
                                                (version, versionIndex) => {
                                                  const dates =
                                                    getTenderDates(version);
                                                  const startDate =
                                                    parseTenderDate(
                                                      dates.startDate
                                                    );
                                                  const endDate = dates.endDate
                                                    ? parseTenderDate(
                                                        dates.endDate
                                                      )
                                                    : new Date(
                                                        startDate.getTime() +
                                                          30 *
                                                            24 *
                                                            60 *
                                                            60 *
                                                            1000
                                                      );

                                                  // Calculate position based on months
                                                  const timelineStartTime =
                                                    timelineRange.start.getTime();
                                                  const timelineEndTime =
                                                    timelineRange.end.getTime();
                                                  const totalTimelineMs =
                                                    timelineEndTime -
                                                    timelineStartTime;

                                                  // Calculate position in pixels
                                                  const startTimeOffset =
                                                    startDate.getTime() -
                                                    timelineStartTime;
                                                  const endTimeOffset =
                                                    endDate.getTime() -
                                                    timelineStartTime;

                                                  // Calculate total width based on view mode
                                                  const unitWidthPx =
                                                    (viewMode === "years"
                                                      ? 200
                                                      : 100) * zoomLevel;
                                                  const totalWidthPx =
                                                    months.length * unitWidthPx;

                                                  // Calculate position as percentage of total timeline width
                                                  const startPct =
                                                    startTimeOffset /
                                                    totalTimelineMs;
                                                  const endPct =
                                                    endTimeOffset /
                                                    totalTimelineMs;

                                                  // Convert percentage to pixels
                                                  const startPx =
                                                    startPct * totalWidthPx;
                                                  const endPx =
                                                    endPct * totalWidthPx;
                                                  const widthPx = Math.max(
                                                    30,
                                                    endPx - startPx
                                                  ); // Ensure minimum width

                                                  // Calculate opacity based on version index
                                                  const opacity =
                                                    1 - versionIndex * 0.15;

                                                  // Check if this tender is highlighted
                                                  const isHighlighted =
                                                    group.tender.isHighlighted;

                                                  // Determine if we should show the title based on width
                                                  // Only show title if bar is wide enough (at least 70px)
                                                  const showTitle =
                                                    widthPx >= 70;

                                                  return (
                                                    <HoverCard
                                                      key={`${group.tender.id}-${version.date}`}
                                                      openDelay={0.1}
                                                      closeDelay={0.1}
                                                    >
                                                      <HoverCardTrigger asChild>
                                                        <button
                                                          onClick={() =>
                                                            setSelectedTender(
                                                              group
                                                            )
                                                          }
                                                          className={cn(
                                                            "absolute rounded-full transition-all group border-2",
                                                            isHighlighted
                                                              ? "border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]" // Highlight the tender bar
                                                              : "border-white",
                                                            group.tender
                                                              .isArchived &&
                                                              "opacity-75 line-through",
                                                            "flex items-center justify-center text-sm",
                                                            TYPE_COLORS[
                                                              version.type as keyof typeof TYPE_COLORS
                                                            ] ||
                                                              TYPE_COLORS.default
                                                          )}
                                                          style={{
                                                            left: `${Math.max(
                                                              0,
                                                              startPx
                                                            )}px`,
                                                            width: `${widthPx}px`,
                                                            height: "26px",
                                                            fontSize: `${
                                                              Math.min(
                                                                16,
                                                                Math.max(
                                                                  8,
                                                                  12 / zoomLevel
                                                                )
                                                              ) * zoomLevel
                                                            }px`,
                                                            top: "50%",
                                                            transform:
                                                              "translateY(-50%)",
                                                            transition:
                                                              "all 0.2s ease-in-out",
                                                            opacity:
                                                              isHighlighted
                                                                ? 1
                                                                : opacity, // Full opacity for highlighted tenders
                                                            zIndex:
                                                              isHighlighted
                                                                ? 50
                                                                : 10 +
                                                                  (group
                                                                    .versions
                                                                    .length -
                                                                    versionIndex), // Higher z-index for highlighted tenders
                                                            textDecoration:
                                                              group.tender
                                                                .isArchived
                                                                ? "line-through"
                                                                : "none",
                                                          }}
                                                        >
                                                          {/* Only show text if bar is wide enough */}
                                                          {showTitle && (
                                                            <span
                                                              className={cn(
                                                                "truncate text-center p-1",
                                                                group.tender
                                                                  .isArchived &&
                                                                  "line-through opacity-70"
                                                              )}
                                                            >
                                                              {
                                                                group.tender
                                                                  .title
                                                              }
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
                                                                TYPE_COLORS[
                                                                  version.type as keyof typeof TYPE_COLORS
                                                                ] ||
                                                                  TYPE_COLORS.default,
                                                                "border-none hover:bg-transparent"
                                                              )}
                                                            >
                                                              {version.type}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground">
                                                              {format(
                                                                parseTenderDate(
                                                                  dates.startDate
                                                                ),
                                                                "PPP"
                                                              )}
                                                            </span>
                                                          </div>
                                                          <p
                                                            className={cn(
                                                              "text-sm font-medium leading-snug",
                                                              group.tender
                                                                .isArchived &&
                                                                "line-through opacity-70"
                                                            )}
                                                          >
                                                            {group.tender.title}
                                                          </p>
                                                          {version.data
                                                            ?.detail?.[
                                                            "預算金額"
                                                          ] && (
                                                            <p className="text-xs text-muted-foreground">
                                                              Budget:{" "}
                                                              {
                                                                version.data
                                                                  .detail[
                                                                  "預算金額"
                                                                ]
                                                              }
                                                            </p>
                                                          )}
                                                          {version.data
                                                            ?.detail?.[
                                                            "招標資料:招標狀態"
                                                          ] && (
                                                            <p className="text-xs text-muted-foreground">
                                                              Status:{" "}
                                                              {
                                                                version.data
                                                                  .detail[
                                                                  "招標資料:招標狀態"
                                                                ]
                                                              }
                                                            </p>
                                                          )}
                                                        </div>
                                                      </HoverCardContent>
                                                    </HoverCard>
                                                  );
                                                }
                                              )}
                                            </React.Fragment>
                                          ))}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Deprecated tenders section */}
              {/* Show deprecated toggle as a text button */}
              <div className="flex items-center justify-center w-full">
                <Button
                  variant="link"
                  className={cn(
                    "text-sm flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all",
                    showDeprecatedTenders && "text-foreground"
                  )}
                  onClick={() =>
                    setShowDeprecatedTenders(!showDeprecatedTenders)
                  }
                >
                  {showDeprecatedTenders ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      Hide deprecated keywords tenders
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      Show deprecated keywords tenders ({" "}
                      {deprecatedTendersCount} )
                    </>
                  )}
                </Button>
              </div>

              {/* Deprecated tenders display */}
              {showDeprecatedTenders && (
                <div className="mt-6">
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <h3 className="text-base font-medium mb-4">
                      Deprecated Tenders
                    </h3>

                    {/* Potential deprecated keywords */}
                    {deprecatedKeywords.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-xs font-medium text-muted-foreground">
                            Potential Keywords:
                          </span>
                          {deprecatedKeywords
                            .slice(0, 10)
                            .map((keyword, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="bg-background/80 text-xs py-0 h-5"
                              >
                                {keyword}
                              </Badge>
                            ))}
                          {deprecatedKeywords.length > 10 && (
                            <Badge
                              variant="outline"
                              className="bg-background/80 text-xs py-0 h-5"
                            >
                              +{deprecatedKeywords.length - 10} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Deprecated tenders list */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {formattedDeprecatedTenders.length > 0 ? (
                        formattedDeprecatedTenders.map((group) => (
                          <div
                            key={group.tender.id}
                            className="p-2.5 bg-background/80 rounded-md border border-border hover:border-primary/30 transition-colors cursor-pointer"
                            onClick={() => setSelectedTender(group)}
                          >
                            <div className="flex flex-col">
                              <h4 className="font-medium text-sm line-clamp-1">
                                {group.tender.title}
                              </h4>
                              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] h-4 px-1"
                                >
                                  {group.tender.type || "Unknown"}
                                </Badge>
                                {group.tender.startDate && (
                                  <span>
                                    {format(
                                      parseTenderDate(group.tender.startDate),
                                      "MMM d, yyyy"
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-muted-foreground col-span-2">
                          No deprecated tenders found
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sheet for tender details (keep this outside the scrollable area) */}
      {selectedTender && (
        <Sheet
          open={!!selectedTender}
          onOpenChange={(open) => !open && setSelectedTender(null)}
        >
          <SheetContent className="sm:max-w-xl w-[600px] p-0">
            <div className="h-full flex flex-col rounded-lg overflow-hidden">
              <SheetHeader className="px-6 py-4 shrink-0 max-w-[460px]">
                <SheetTitle
                  className={cn(
                    "text-xl font-semibold",
                    selectedTender.tender.isArchived &&
                      "line-through opacity-70"
                  )}
                >
                  {selectedTender.tender.title}
                </SheetTitle>
                <SheetDescription>
                  <div className="flex items-center gap-2 m-2">
                    <span>
                      {`
                      ${format(
                        parseTenderDate(
                          selectedTender.tender.startDate ||
                            selectedTender.tender.date
                        ),
                        "PPP"
                      )} 
                      → 
                      ${format(
                        parseTenderDate(
                          selectedTender.tender.endDate ||
                            selectedTender.tender.startDate ||
                            selectedTender.tender.date
                        ),
                        "PPP"
                      )}
                      `}
                    </span>
                  </div>
                </SheetDescription>
              </SheetHeader>

              <Tabs
                defaultValue="overview"
                className="flex-1 flex flex-col min-h-0"
              >
                <TabsList className="px-6 pt-4 pb-0 shrink-0 bg-transparent border-b flex w-full justify-start space-x-2">
                  <TabsTrigger
                    value="overview"
                    className="rounded-t-md rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="details"
                    className="rounded-t-md rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="versions"
                    className="rounded-t-md rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2"
                  >
                    Versions
                  </TabsTrigger>
                </TabsList>

                {/* Overview tab */}
                <div className="flex-1 overflow-y-auto">
                  <TabsContent value="overview" className="p-6 space-y-4 mt-0">
                    <div className="grid grid-cols-2 gap-4 max-w-full">
                      <Card className="overflow-hidden border-none shadow-md">
                        <CardHeader className="bg-slate-50 dark:bg-slate-500/30 pb-3 border-b">
                          <CardTitle className="text-base font-medium flex items-center gap-2">
                            <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-1.5 rounded-md">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="lucide lucide-activity"
                              >
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                              </svg>
                            </div>
                            Status
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 dark:border-t dark:border-white/30">
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-blue-500 mr-2" />
                            <span className="font-medium text-sm truncate">
                              {selectedTender.tender.brief?.[
                                "招標資料:招標狀態"
                              ] || (
                                <span className="text-muted-foreground italic">
                                  N/A
                                </span>
                              )}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="overflow-hidden border-none shadow-md">
                        <CardHeader className="bg-slate-50 dark:bg-slate-500/30 pb-3 border-b">
                          <CardTitle className="text-base font-medium flex items-center gap-2">
                            <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-1.5 rounded-md">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="lucide lucide-tag"
                              >
                                <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
                                <circle cx="7.5" cy="7.5" r="1.5" />
                              </svg>
                            </div>
                            Type
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 dark:border-t dark:border-white/30">
                          <span className="font-medium text-sm truncate block">
                            {selectedTender.tender.type || (
                              <span className="text-muted-foreground italic">
                                Unknown
                              </span>
                            )}
                          </span>
                        </CardContent>
                      </Card>

                      <Card className="overflow-hidden border-none shadow-md">
                        <CardHeader className="bg-slate-50 dark:bg-slate-500/30 pb-3 border-b">
                          <CardTitle className="text-base font-medium flex items-center gap-2">
                            <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-1.5 rounded-md">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="lucide lucide-wallet"
                              >
                                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                              </svg>
                            </div>
                            Budget
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 dark:border-t dark:border-white/30">
                          <span className="font-medium text-sm truncate block">
                            {selectedTender.tender?.brief?.[
                              "採購資料:預算金額"
                            ] ||
                              selectedTender.tender?.brief?.[
                                "已公告資料:預算金額"
                              ] || (
                                <span className="text-muted-foreground italic">
                                  N/A
                                </span>
                              )}
                          </span>
                        </CardContent>
                      </Card>

                      <Card className="overflow-hidden border-none shadow-md">
                        <CardHeader className="bg-slate-50 dark:bg-slate-500/30 pb-3 border-b">
                          <CardTitle className="text-base font-medium flex items-center gap-2">
                            <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-1.5 rounded-md">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="lucide lucide-hourglass"
                              >
                                <path d="M5 22h14" />
                                <path d="M5 2h14" />
                                <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
                                <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
                              </svg>
                            </div>
                            Duration
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 dark:border-t dark:border-white/30">
                          <span className="font-medium text-sm truncate block">
                            {selectedTender.tender?.brief?.[
                              "其他:履約期限"
                            ] || (
                              <span className="text-muted-foreground italic">
                                N/A
                              </span>
                            )}
                          </span>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="overflow-hidden border-none shadow-md max-w-full">
                      <CardHeader className="bg-slate-50 dark:bg-slate-500/30 pb-3 border-b">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-1.5 rounded-md">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="lucide lucide-file-text"
                            >
                              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" x2="8" y1="13" y2="13" />
                              <line x1="16" x2="8" y1="17" y2="17" />
                              <line x1="10" x2="8" y1="9" y2="9" />
                            </svg>
                          </div>
                          Description
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 dark:border-t dark:border-white/30">
                        <p className="text-sm break-words">
                          {selectedTender.tender?.brief?.[
                            "採購資料:標的分類"
                          ] || (
                            <span className="text-muted-foreground italic">
                              No description available
                            </span>
                          )}
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Details tab */}
                  <TabsContent value="details" className="p-6 space-y-4 mt-0">
                    {selectedTender.tender.brief && (
                      <ScrollArea className="h-[calc(100vh-200px)]">
                        <div className="space-y-6 px-2 max-w-full">
                          {/* Basic Information */}
                          <Card className="overflow-hidden border-none shadow-md">
                            <CardHeader className="bg-slate-50 dark:bg-slate-500/30 pb-3 border-b">
                              <CardTitle className="text-base font-medium flex items-center gap-2">
                                <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-1.5 rounded-md">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-file-text"
                                  >
                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" x2="8" y1="13" y2="13" />
                                    <line x1="16" x2="8" y1="17" y2="17" />
                                    <line x1="10" x2="8" y1="9" y2="9" />
                                  </svg>
                                </div>
                                Basic Information
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                              <div className="divide-y">
                                {[
                                  ["採購資料:標案名稱", "Project Name"],
                                  ["採購資料:標的分類", "Category"],
                                  ["採購資料:招標方式", "Method"],
                                  ["採購資料:預算金額", "Budget"],
                                  ["採購資料:標案案號", "Project Number"],
                                ].map(([key, label], index) => (
                                  <div
                                    key={key}
                                    className={cn(
                                      "flex items-start p-4 hover:bg-muted/30 transition-colors",
                                      index % 2 === 0
                                        ? "bg-transparent"
                                        : "bg-muted/10"
                                    )}
                                  >
                                    <dt className="w-1/3 text-sm font-medium text-muted-foreground">
                                      {label}
                                    </dt>
                                    <dd className="w-2/3 text-sm break-words font-medium">
                                      {selectedTender.tender.brief?.[key] || (
                                        <span className="text-muted-foreground italic">
                                          N/A
                                        </span>
                                      )}
                                    </dd>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Timeline Information */}
                          <Card className="overflow-hidden border-none shadow-md">
                            <CardHeader className="bg-slate-50 dark:bg-slate-500/30 pb-3 border-b">
                              <CardTitle className="text-base font-medium flex items-center gap-2">
                                <div className="bg-violet-500/10 text-violet-600 dark:text-violet-400 p-1.5 rounded-md">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-calendar"
                                  >
                                    <rect
                                      width="18"
                                      height="18"
                                      x="3"
                                      y="4"
                                      rx="2"
                                      ry="2"
                                    />
                                    <line x1="16" x2="16" y1="2" y2="6" />
                                    <line x1="8" x2="8" y1="2" y2="6" />
                                    <line x1="3" x2="21" y1="10" y2="10" />
                                  </svg>
                                </div>
                                Timeline
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                              <div className="divide-y">
                                {[
                                  ["招標資料:公告日", "Announcement Date"],
                                  ["領投開標:截止投標", "Submission Deadline"],
                                  ["領投開標:開標時間", "Opening Date"],
                                  ["其他:履約期限", "Contract Duration"],
                                ].map(([key, label], index) => (
                                  <div
                                    key={key}
                                    className={cn(
                                      "flex items-start p-4 hover:bg-muted/30 transition-colors",
                                      index % 2 === 0
                                        ? "bg-transparent"
                                        : "bg-muted/10"
                                    )}
                                  >
                                    <dt className="w-1/3 text-sm font-medium text-muted-foreground">
                                      {label}
                                    </dt>
                                    <dd className="w-2/3 text-sm break-words font-medium">
                                      {selectedTender.tender.brief?.[key] || (
                                        <span className="text-muted-foreground italic">
                                          N/A
                                        </span>
                                      )}
                                    </dd>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Additional Details */}
                          <Card className="overflow-hidden border-none shadow-md max-w-full">
                            <CardHeader className="bg-slate-50 dark:bg-slate-500/30 pb-3 border-b">
                              <CardTitle className="text-base font-medium flex items-center gap-2">
                                <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-1.5 rounded-md">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-list-details"
                                  >
                                    <path d="M3 14h4v4H3z" />
                                    <path d="M3 6h4v4H3z" />
                                    <path d="M11 6h10v4H11z" />
                                    <path d="M11 14h10v4H11z" />
                                  </svg>
                                </div>
                                Additional Details
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                              <div className="divide-y">
                                {selectedTender.tender.brief &&
                                  Object.entries(selectedTender.tender.brief)
                                    .filter(
                                      ([key]) =>
                                        !key.includes("機關資料:") &&
                                        !key.includes("招標資料:") &&
                                        !key.includes("領投開標:") &&
                                        !key.includes("其他:")
                                    )
                                    .map(([key, value], index) => (
                                      <div
                                        key={key}
                                        className={cn(
                                          "flex items-start p-4 hover:bg-muted/30 transition-colors",
                                          index % 2 === 0
                                            ? "bg-transparent"
                                            : "bg-muted/10"
                                        )}
                                      >
                                        <dt className="w-1/3 text-sm font-medium text-muted-foreground truncate mr-2">
                                          {key}
                                        </dt>
                                        <dd className="w-2/3 text-sm break-words">
                                          {typeof value === "object" &&
                                          value !== null ? (
                                            <div className="bg-muted/80 dark:bg-muted/40 p-3 rounded-md text-xs font-mono shadow-sm">
                                              <div className="flex justify-between items-center mb-1 text-xs text-muted-foreground">
                                                <span>Object data</span>
                                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                                                  JSON
                                                </span>
                                              </div>
                                              <div className="overflow-auto max-h-40">
                                                <pre className="text-pretty">
                                                  {JSON.stringify(
                                                    value,
                                                    null,
                                                    2
                                                  )}
                                                </pre>
                                              </div>
                                            </div>
                                          ) : (
                                            value || (
                                              <span className="text-muted-foreground italic">
                                                N/A
                                              </span>
                                            )
                                          )}
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

                  {/* Versions tab */}
                  <TabsContent value="versions" className="p-6 space-y-0 mt-0 relative">
                    {/* Instead of a continuous line, we'll position line segments between the icons */}
                    
                    {selectedTender.versions?.map((version, index, array) => (
                      <div key={index} className="relative z-10 mb-0">
                        {/* Container to group an icon with its following card */}
                        <div className="relative">
                          {/* Top row with icon and date */}
                          <div className="flex items-center mb-3 gap-4">
                            {/* Git icon node */}
                            <div className="relative w-[1.8rem] h-[1.8rem] rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-gray-900 z-20 flex items-center justify-center shadow-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                                <circle cx="12" cy="12" r="4"/>
                                <path d="M1.05 12H7"/>
                                <path d="M17.01 12h5.95"/>
                              </svg>
                            </div>
                            
                            {/* Date, aligned with the icon */}
                            <span className="text-xs text-muted-foreground font-medium">
                              {format(parseTenderDate(version.date), "PPP")}
                            </span>
                          </div>
                          
                          {/* Card content row with vertical line */}
                          <div className="flex">
                            {/* Vertical line container */}
                            <div className="relative w-[3rem] flex-shrink-0">
                              {/* Vertical line that now appears for all items, with special handling for the last one */}
                              <div className={cn(
                                "absolute left-[14px] w-[1.5px] bg-gray-200 dark:bg-gray-700 z-10",
                                index < array.length - 1 
                                  ? "top-0 bottom-4" // Full height for non-last items
                                  : "top-0 h-full max-h-[185px]" // Limited height for last item, only extends to card height
                              )}></div>
                            </div>
                            
                            {/* Card container */}
                            <div className="flex-grow">
                              <Card className="overflow-hidden border-none shadow-md max-w-full mb-8">
                                <CardHeader className="bg-slate-50 dark:bg-slate-500/30 py-3 border-b">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <CardTitle className="text-sm font-medium flex items-center">
                                        <Badge
                                          className={cn(
                                            TYPE_COLORS[
                                              version.type as keyof typeof TYPE_COLORS
                                            ] || TYPE_COLORS.default,
                                            "border-none hover:bg-transparent"
                                          )}
                                        >
                                          {version.type}
                                        </Badge>
                                      </CardTitle>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                  {version.data?.brief && (
                                    <div className="divide-y">
                                      {Object.entries(version.data.brief)
                                        .filter(
                                          ([key, value]) =>
                                            value && typeof value === "string"
                                        )
                                        .map(([key, value], idx) => (
                                          <div
                                            key={key}
                                            className={cn("flex items-start p-3 hover:bg-muted/30 transition-colors", 
                                              idx % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                                            )}
                                          >
                                            <dt className="w-1/3 text-xs font-medium text-muted-foreground truncate mr-2">
                                              {key}
                                            </dt>
                                            <dd className="w-2/3 text-xs break-words">
                                              {value as string || <span className="text-muted-foreground italic">N/A</span>}
                                            </dd>
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
