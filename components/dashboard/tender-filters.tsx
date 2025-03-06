"use client"

import { useState, useEffect, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ChevronUp, ChevronDown } from "lucide-react"
import { formatTenderDate } from "@/lib/date-utils"
import { startOfMonth, endOfMonth, addMonths, format } from "date-fns"
import { TenderGroup } from "@/types/tender"

// Move FilterSection outside of TenderFilters component
// This prevents it from being recreated on every render
const FilterSection = ({ 
  title, 
  items, 
  selectedItems, 
  onItemClick, 
  onSelectAll, 
  onClear, 
  onBatchSelect 
}: { 
  title: string
  items: string[]
  selectedItems: string[]
  onItemClick: (item: string) => void
  onSelectAll: () => void
  onClear: () => void
  onBatchSelect: (items: string[]) => void
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const MAX_VISIBLE_ROWS = 2
  const ITEMS_PER_ROW = 3 // Approximate items per row
  
  // Filter items based on search term
  const filteredItems = searchTerm 
    ? items.filter(item => item.toLowerCase().includes(searchTerm.toLowerCase()))
    : items
  
  // Only limit visible items if not searching and not expanded
  const visibleItems = searchTerm || isExpanded 
    ? filteredItems 
    : filteredItems.slice(0, MAX_VISIBLE_ROWS * ITEMS_PER_ROW)
    
  const hasMore = !searchTerm && filteredItems.length > MAX_VISIBLE_ROWS * ITEMS_PER_ROW

  // Function to select all filtered items
  const handleSelectAllFiltered = () => {
    //! Don't select items one by one - this causes re-renders
    //! Instead, collect all items to select and pass them at once
    const itemsToAdd = filteredItems.filter(item => !selectedItems.includes(item));
    
    if (itemsToAdd.length > 0) {
      // Create a new array with all selected items
      const newSelection = [...selectedItems, ...itemsToAdd];
      
      // Use a batch update approach instead of individual updates
      // This will prevent multiple re-renders
      onBatchSelect(newSelection);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="
                h-8 w-32 rounded-md border border-input bg-background dark:border-gray-500
                px-3 py-1 text-sm shadow-sm transition-colors
                placeholder:text-muted-foreground focus-visible:outline-none 
                focus-visible:ring-1 focus-visible:ring-ring
                "
            />
            {searchTerm && (
              <button 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchTerm("")}
              >
                ×
              </button>
            )}
          </div>
          {searchTerm && filteredItems.length > 0 && (
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleSelectAllFiltered}
            >
              Select Searched
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onSelectAll}
          >
            Select All
          </Button>
          <Button 
            variant={selectedItems.length > 0 ? "destructive" : "ghost"} 
            size="sm"
            onClick={onClear}
          >
            Clear
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {visibleItems.map((item: string) => (
            <Badge
              key={item}
              variant={selectedItems.includes(item) ? "default" : "outline"}
              className="cursor-pointer dark:border-gray-500"
              onClick={() => onItemClick(item)}
            >
              {item}
            </Badge>
          ))}
          {filteredItems.length === 0 && searchTerm && (
            <p className="text-sm text-muted-foreground">No matching items found</p>
          )}
        </div>
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show Less' : `Show ${filteredItems.length - visibleItems.length} More...`}
          </Button>
        )}
      </div>
    </div>
  )
}

interface FilterState {
  inbox: boolean;
  archived: boolean;
  favorite: boolean;
}

interface TenderFiltersProps {
  tags: string[]
  types: string[]
  tenders: TenderGroup[]
  dateRange: [number, number]
  currentFilters?: {
    tags: string[]
    types: string[]
    organizations: string[]
    dateRange: [number, number]
    sortDirection: 'asc' | 'desc'
  }
  onFilterChange: (filters: {
    tags: string[]
    types: string[]
    organizations: string[]
    dateRange: [number, number]
    sortDirection: 'asc' | 'desc'
  }) => void
}

export function TenderFilters({ 
  tags, 
  types, 
  tenders, 
  dateRange, 
  currentFilters,
  onFilterChange 
}: TenderFiltersProps) {
  // Initialize with values from currentFilters if available
  const [selectedTags, setSelectedTags] = useState<string[]>(
    currentFilters?.tags || []
  )
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    currentFilters?.types || []
  )
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>(
    currentFilters?.organizations || []
  )
  const [currentDateRange, setCurrentDateRange] = useState(
    currentFilters?.dateRange || dateRange
  )
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    currentFilters?.sortDirection || 'desc'
  )
  const [filters, setFilters] = useState<FilterState>({
    inbox: true,
    archived: true,
    favorite: true,
  });
  const [currentValue, setCurrentValue] = useState([0, 0])

  // Add an effect to update the state when currentFilters changes
  useEffect(() => {
    if (currentFilters) {
      setSelectedTags(currentFilters.tags || []);
      setSelectedTypes(currentFilters.types || []);
      setSelectedOrgs(currentFilters.organizations || []);
      setCurrentDateRange(currentFilters.dateRange || dateRange);
      setSortDirection(currentFilters.sortDirection || 'desc');
    }
  }, [currentFilters, dateRange]);

  // Update currentDateRange when dateRange prop changes
  useEffect(() => {
    setCurrentDateRange(dateRange)
  }, [dateRange])

  const updateFilters = (updates: Partial<Parameters<typeof onFilterChange>[0]>) => {
    // Create the filter object with current state
    const filterUpdate = {
      tags: selectedTags,
      types: selectedTypes,
      organizations: selectedOrgs,
      dateRange: currentDateRange,
      sortDirection,
      ...updates
    };
    
    // Log what we're sending to the parent
    console.log('Sending filter update:', filterUpdate);
    
    // Call the parent's filter function with a slight delay to ensure state is updated
    setTimeout(() => {
      onFilterChange(filterUpdate);
    }, 0);
    
    // Log the number of matching tenders for debugging
    // if (tenders?.length) {
    //   const matchingTenders = tenders.filter(g => matchesTenderFilters(g));
    //   console.log(`Matching tenders: ${matchingTenders.length} out of ${tenders.length}`);
      
    //   // Log the IDs of the matching tenders
    //   console.log('Matching tender IDs:', matchingTenders.map(g => g.tender?.id));
      
    //   // Log the organizations of the matching tenders
    //   console.log('Matching tender organizations:', matchingTenders.map(g => {
    //     const orgs = [];
    //     if (g.tender?.unit_name) orgs.push(g.tender.unit_name);
    //     g.versions?.forEach(v => {
    //       const org = v.data?.unit_name || v.enrichedData?.unit_name || 
    //                  v.data?.detail?.["機關資料:機關名稱"] || 
    //                  v.data?.detail?.["機關資料:單位名稱"];
    //       if (org) orgs.push(org);
    //     });
    //     return { id: g.tender?.id, orgs };
    //   }));
    // }
  }

  // Convert YYYYMMDD to month steps
  const getMonthFromYYYYMMDD = (date: number) => {
    try {
      const dateStr = date.toString()
      const year = parseInt(dateStr.substring(0, 4))
      const month = parseInt(dateStr.substring(4, 6)) - 1
      return new Date(year, month)
    } catch (error) {
      console.error('Error parsing date:', date, error)
      return new Date()
    }
  }

  // Calculate month difference for slider
  const startMonth = getMonthFromYYYYMMDD(Math.min(...dateRange))
  const endMonth = getMonthFromYYYYMMDD(Math.max(...dateRange))
  const monthDiff = (endMonth.getFullYear() - startMonth.getFullYear()) * 12 + 
    (endMonth.getMonth() - startMonth.getMonth())

  // Helper function to safely format date
  const formatYYYYMMDD = (date: Date) => {
    try {
      return parseInt(format(date, 'yyyyMMdd'))
    } catch (error) {
      console.error('Error formatting date:', date, error)
      return 0
    }
  }

  //! Add safe date formatting helper to prevent errors when no tenders are available
  const safeFormatDate = (baseDate: Date, monthsToAdd: number, formatStr: string) => {
    try {
      // Validate the base date is valid
      if (!baseDate || isNaN(baseDate.getTime())) {
        return '—';
      }
      const newDate = addMonths(baseDate, monthsToAdd);
      // Ensure the result is a valid date
      if (isNaN(newDate.getTime())) {
        return '—';
      }
      return format(newDate, formatStr);
    } catch (error) {
      console.error('Error safely formatting date:', error);
      return '—';
    }
  };

  //! Check if we have valid date ranges
  const hasValidDateRange = startMonth && 
    endMonth && 
    !isNaN(startMonth.getTime()) && 
    !isNaN(endMonth.getTime()) && 
    dateRange.length === 2 && 
    dateRange.every(d => d > 0);

  // Get unique organizations - FIXED to check all possible locations
  const organizations = useMemo(() => {
    if (!tenders?.length) return [] as string[]
    
    // Extract unit_name from tenders based on the structure in tender-card.tsx
    const allOrgs = tenders.flatMap(g => {
      // Get organization from main tender
      const tenderOrg = g.tender?.unit_name;
      
      // Get organizations from versions
      const versionOrgs = (g.versions || [])
        .map(v => {
          // Check all possible locations for unit_name
          return v.data?.unit_name || 
                 v.enrichedData?.unit_name || 
                 v.data?.detail?.["機關資料:機關名稱"] || 
                 v.data?.detail?.["機關資料:單位名稱"];
        })
        .filter(Boolean);
      
      // Log for debugging with more detail
      // console.log('Tender organization data:', {
      //   tenderId: g.tender?.id,
      //   tenderOrg,
      //   versionOrgs,
      //   versionDetail: g.versions?.[0]?.data?.detail
      // });
      
      return [tenderOrg, ...versionOrgs].filter(Boolean);
    });
    
    // Remove duplicates and sort
    return Array.from(new Set(allOrgs)).sort() as string[];
  }, [tenders])

  // Use the organizations we extract instead of the empty tags array passed as props
  useEffect(() => {
    // Only update if we have no selected items yet and there are organizations
    if (selectedOrgs.length === 0 && organizations.length > 0) {
      // console.log('Using extracted organizations:', organizations);
    }
  }, [organizations, selectedOrgs]);

  // Get all unique tags/keywords - FIXED to only use actual tags
  const extractedTags = useMemo(() => {
    if (!tenders?.length) return [] as string[]
    
    // Extract ONLY real tags from tenders
    const allTags = tenders.flatMap(g => {
      // Get tags from main tender - this is the only real source of tags
      const tenderTags = Array.isArray(g.tender?.tags) ? g.tender.tags : [];
      
      // Log for debugging
      // console.log('Tender tag data:', {
      //   tenderId: g.tender?.id,
      //   tenderTags
      // });
      
      // Only use the actual tags, not titles or keywords
      return tenderTags;
    });
    
    // Remove duplicates and sort
    return Array.from(new Set(allTags)).sort() as string[];
  }, [tenders])

  // Use the tags we extract instead of the empty tags array passed as props
  useEffect(() => {
    // Only update if we have no selected items yet and there are extracted items
    if (selectedTags.length === 0 && extractedTags.length > 0) {
      // console.log('Using extracted tags:', extractedTags);
    }
  }, [extractedTags, selectedTags]);

  // Log render conditions
  useEffect(() => {
    console.log('Render conditions:', {
      showTags: extractedTags.length > 0,
      showOrgs: organizations.length > 0,
      showTypes: types.length > 0
    });
  }, [extractedTags, organizations, types]);

  // Add select all functionality
  const handleSelectAll = (type: 'tags' | 'types' | 'organizations', items: string[]) => {
    switch (type) {
      case 'tags':
        setSelectedTags(items)
        updateFilters({ tags: items })
        break
      case 'types':
        setSelectedTypes(items)
        updateFilters({ types: items })
        break
      case 'organizations':
        setSelectedOrgs(items)
        updateFilters({ organizations: items })
        break
    }
  }

  const handleDeselectAll = (type: 'tags' | 'types' | 'organizations') => {
    switch (type) {
      case 'tags':
        setSelectedTags([])
        updateFilters({ tags: [] })
        break
      case 'types':
        setSelectedTypes([])
        updateFilters({ types: [] })
        break
      case 'organizations':
        setSelectedOrgs([])
        updateFilters({ organizations: [] })
        break
    }
  }

  // Add a function to check if a tender matches the current filters
  const matchesTenderFilters = (tenderGroup: any) => {
    // If no filters are selected, show all tenders
    if (selectedTags.length === 0 && selectedTypes.length === 0 && selectedOrgs.length === 0) {
      return true;
    }
    
    const tender = tenderGroup.tender;
    const versions = tenderGroup.versions || [];
    
    // Check if tender matches selected tags
    let matchesTags = selectedTags.length === 0;
    if (selectedTags.length > 0) {
      // Get tags from tender
      const tenderTags = Array.isArray(tender?.tags) ? tender.tags : [];
      
      // Check if any selected tag is in the tender tags
      matchesTags = tenderTags.some(tag => selectedTags.includes(tag));
      
      // Log for debugging
      // console.log('Tag matching:', {
      //   tenderId: tender?.id,
      //   tenderTags,
      //   selectedTags,
      //   matchesTags
      // });
    }
    
    // Check if tender matches selected types
    let matchesTypes = selectedTypes.length === 0;
    if (selectedTypes.length > 0) {
      matchesTypes = tender?.brief?.type && selectedTypes.includes(tender.brief.type);
    }
    
    // Check if tender matches selected organizations
    let matchesOrgs = selectedOrgs.length === 0;
    
    if (selectedOrgs.length > 0) {
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
      
      // Check if any selected organization is in the tender organizations
      matchesOrgs = orgs.some(org => selectedOrgs.includes(org));
      
      // Log for debugging
      // console.log('Organization matching:', {
      //   tenderId: tender?.id,
      //   orgs,
      //   selectedOrgs,
      //   matchesOrgs,
      //   versionDetail: versions[0]?.data?.detail
      // });
    }
    
    return matchesTags && matchesTypes && matchesOrgs;
  };

  // Log the number of matching tenders for debugging
  useEffect(() => {
    if (tenders?.length) {
      const matchingTenders = tenders.filter(g => matchesTenderFilters(g));
      console.log(`Matching tenders: ${matchingTenders.length} out of ${tenders.length}`);
    }
  }, [selectedTags, selectedTypes, selectedOrgs, tenders]);

  // Create a summary of active filters
  const activeFiltersText = useMemo(() => {
    const parts: string[] = []
    if (selectedTags.length > 0) {
      parts.push(`tags: ${selectedTags.join(', ')}`)
    }
    if (selectedOrgs.length > 0) {
      parts.push(`bureau: ${selectedOrgs.join(', ')}`)
    }
    if (selectedTypes.length > 0) {
      parts.push(`types: ${selectedTypes.join(', ')}`)
    }
    return parts.length > 0 ? parts.join(' | ') : ''
  }, [selectedTags, selectedOrgs, selectedTypes])

  // In the render section, update the log to show selected items
  useEffect(() => {
    console.log('Current filter state:', {
      selectedTags,
      selectedTypes,
      selectedOrgs,
      extractedTags: extractedTags.length,
      organizations: organizations.length
    });
  }, [selectedTags, selectedTypes, selectedOrgs, extractedTags, organizations]);

  // Add these batch selection functions
  const handleBatchSelectTags = (tags: string[]) => {
    setSelectedTags(tags);
    updateFilters({ tags });
  };

  const handleBatchSelectTypes = (types: string[]) => {
    setSelectedTypes(types);
    updateFilters({ types });
  };

  const handleBatchSelectOrgs = (orgs: string[]) => {
    setSelectedOrgs(orgs);
    updateFilters({ organizations: orgs });
  };

  return (
    <div className="space-y-4">
      {/* Tags Filter - REMOVED */}
      {/* extractedTags.length > 0 && (
        <div className="p-3 border rounded-md bg-muted/30">
          <FilterSection
            title="Tags"
            items={extractedTags}
            selectedItems={selectedTags}
            onItemClick={(tag) => {
              const newTags = selectedTags.includes(tag)
                ? selectedTags.filter(t => t !== tag)
                : [...selectedTags, tag]
              setSelectedTags(newTags)
              updateFilters({ tags: newTags })
            }}
            onSelectAll={() => handleSelectAll('tags', extractedTags)}
            onClear={() => handleDeselectAll('tags')}
          />
        </div>
      ) */}

      {/* Organization Filter */}
      {organizations.length > 0 && (
        <div className="p-3 border rounded-md bg-muted/30">
          <FilterSection
            title="Bureau"
            items={organizations}
            selectedItems={selectedOrgs}
            onItemClick={(org) => {
              const newOrgs = selectedOrgs.includes(org)
                ? selectedOrgs.filter(o => o !== org)
                : [...selectedOrgs, org]
              setSelectedOrgs(newOrgs)
              updateFilters({ organizations: newOrgs })
            }}
            onSelectAll={() => handleSelectAll('organizations', organizations)}
            onClear={() => handleDeselectAll('organizations')}
            onBatchSelect={handleBatchSelectOrgs}
          />
        </div>
      )}

      {/* Types Filter */}
      {types.length > 0 && (
        <div className="p-3 border rounded-md bg-muted/30">
          <FilterSection
            title="Types"
            items={types}
            selectedItems={selectedTypes}
            onItemClick={(type) => {
              const newTypes = selectedTypes.includes(type)
                ? selectedTypes.filter(t => t !== type)
                : [...selectedTypes, type]
              setSelectedTypes(newTypes)
              updateFilters({ types: newTypes })
            }}
            onSelectAll={() => handleSelectAll('types', types)}
            onClear={() => handleDeselectAll('types')}
            onBatchSelect={handleBatchSelectTypes}
          />
        </div>
      )}

      {/* Date Range Slider */}
      <div className="p-3 border rounded-md bg-muted/30">
        <h4 className="text-sm font-medium mb-2">Date Range</h4>
        <div className="px-2">
          <div className="text-center text-sm text-muted-foreground mb-2">
            {hasValidDateRange ? (
              <>
                {safeFormatDate(startMonth, currentValue[0], 'yyyy/MM')} - {safeFormatDate(startMonth, currentValue[1], 'yyyy/MM')}
              </>
            ) : (
              <span>No date range available</span>
            )}
          </div>
          {hasValidDateRange ? (
            <>
              <Slider
                min={0}
                max={monthDiff}
                step={1}
                defaultValue={[0, monthDiff]}
                onValueChange={(value) => {
                  try {
                    const startDate = addMonths(startMonth, value[0])
                    const endDate = addMonths(startMonth, value[1])
                    const newStartDate = parseInt(format(startDate, 'yyyyMMdd'))
                    const newEndDate = parseInt(format(endDate, 'yyyyMMdd'))
                    setCurrentDateRange([newStartDate, newEndDate])
                    setCurrentValue(value) // Store current value for display
                    updateFilters({ dateRange: [newStartDate, newEndDate] })
                  } catch (error) {
                    console.error('Error updating date range:', error)
                  }
                }}
                className="my-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{safeFormatDate(startMonth, 0, 'yyyy/MM')}</span>
                <span>{safeFormatDate(endMonth, 0, 'yyyy/MM')}</span>
              </div>
            </>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Date slider unavailable until tenders are loaded
            </div>
          )}
        </div>
      </div>
    </div>
  )
}