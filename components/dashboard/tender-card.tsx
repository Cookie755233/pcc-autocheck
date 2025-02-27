"use client"

import { useState, useMemo, useCallback } from "react"
import { Tender } from "@/types/tender"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Archive, ExternalLink, RotateCcw, Star } from "lucide-react"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn, stringToColor } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "@/components/ui/use-toast"
import { getTenderLayout } from './tender-layouts/tender-layout'
import { BiddingLayout, AwardedLayout, FailedBidLayout, DeliveryLayout } from './tender-layouts'
import { useNotifications } from "@/contexts/notification-context"


//@ Format YYYYMMDD to date string
function formatTenderDate(dateNum: number): string {
  const dateStr = dateNum.toString()
  const year = parseInt(dateStr.substring(0, 4))
  const month = parseInt(dateStr.substring(4, 6)) - 1
  const day = parseInt(dateStr.substring(6, 8))
  return format(new Date(year, month, day), 'yyyy/MM/dd')
}

interface TenderCardProps {
  tender: Tender
  versions: TenderVersion[]
  relatedTenders?: Tender[]
  onArchive?: (tenderId: string, isArchived: boolean) => void
  onHighlight?: (tenderId: string, isHighlighted: boolean) => void
  isNew?: boolean
}

interface TenderVersion {
  id: string;
  tenderId: string;
  date: number;
  type: string;
  data: any;
  createdAt: Date;
  enrichedData: {
    url?: string;
    unit_id?: string;
    unit_name?: string;
    job_number?: string;
    brief?: {
      type: string;
      title: string;
      category?: string;
      companies?: {
        ids: string[];
        names: string[];
        id_key: Record<string, string[]>;
        name_key: Record<string, string[]>;
      };
    };
    detail?: any;
    awardData?: {
      totalAmount?: string;
      isPublic?: boolean;
      basePrice?: string;
      awardDate?: string;
      winner?: string;
      winningBid?: string;
    };
    failureData?: {
      reason?: string;
      failureDate?: string;
      nextAction?: string;
    };
  };
}

// Add this style to show notification badge
const NotificationBadge = ({ count }: { count: number }) => (
  <div className="absolute -top-2 -right-2 flex items-center justify-center">
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-red-500 blur-sm opacity-50" />
      <div className="relative bg-red-500 text-white font-bold rounded-full min-w-[27px] h-[27px] flex items-center justify-center px-1 text-lg">
        {count}
      </div>
    </div>
  </div>
);

// Add this helper function at the top of the file
function findMatchingRecord(details: any, currentTender: Tender) {
  if (!details?.records) return null;
  
  //@ Find the record that matches the current tender's type and date
  return details.records.find((record: any) => {
    const recordType = record.detail["採購資料:標案性質"] || record.detail["招標資料:標案性質"];
    const recordDate = record.date;
    return recordType === currentTender.brief.type && recordDate === currentTender.date;
  }) || details.records[0]; // Fallback to first record if no match found
}

export function TenderCard({ 
  tender,
  versions,
  relatedTenders,
  onArchive,
  onHighlight,
  isNew = false
}: TenderCardProps) {
  const { markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false)
  const [details, setDetails] = useState<Record<number, any>>({}) // Store details for each tender version
  const [isLoading, setIsLoading] = useState(false)
  const [selectedVersionId, setSelectedVersionId] = useState<string>(versions[0]?.id || '')
  const [currentTender, setCurrentTender] = useState(tender)
  const [isArchiving, setIsArchiving] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState(0)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isHighlighting, setIsHighlighting] = useState(false)

  // Update validation
  if (!tender?.title) {
    console.warn('Invalid tender data:', tender);
    return null;
  }

  //@ Get all versions from the details with proper typing and unique IDs
  const getVersions = (details: any): TenderVersion[] => {
    if (!details?.records) return [];
    return details.records.map((record: any) => ({
      date: record.date,
      type: record.brief?.type || record.detail["招標資料:標案性質"] || record.detail["採購資料:標案性質"],
      id: `${record.date}-${record.brief?.type || record.type}`,
      version: 1,
      data: {
        date: record.date,
        brief: record.brief,
        unit_name: record.unit_name
      },
      createdAt: new Date()
    }));
  };

  //@ Get the current record based on selected version
  const getCurrentRecord = (details: any) => {
    if (!details?.records) return null;
    if (selectedVersionId === null) {
      return details.records[0];
    }
    const [date, type] = selectedVersionId.split('-');
    return details.records.find((record: any) => 
      record.date.toString() === date && 
      (record.brief?.type === type || record.type === type)
    );
  };

  const fetchDetails = async () => {
    if (!tender?.id) return;
    
    try {
      setIsLoading(true);
      
      // Extract unit_id and job_number from the tender ID
      const [unitIdParam, jobNumberParam] = tender.id.split('&');
      const unitId = unitIdParam.split('=')[1];
      const jobNumber = jobNumberParam.split('=')[1];
      
      if (!unitId || !jobNumber) {
        throw new Error('Invalid tender ID format');
      }
      
      // Use a try-catch block for the fetch operation
      try {
        const response = await fetch(
          `https://pcc.g0v.ronny.tw/api/tender?unit_id=${unitId}&job_number=${jobNumber}`
        );
        
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        setDetails(data);
      } catch (fetchError) {
        console.error('Error during fetch operation:', fetchError);
        // Use a fallback approach - get data from our database
        const dbVersions = await fetch(`/api/tenders/${encodeURIComponent(tender.id)}/versions`);
        if (dbVersions.ok) {
          const versionsData = await dbVersions.json();
          setDetails({ records: versionsData.map((v: any) => v.data) });
        } else {
          throw new Error('Failed to fetch from both API and database');
        }
      }
    } catch (error) {
      console.error('Error fetching tender details:', error);
      toast({
        title: 'Cant get tender details',
        description: 'Please try again later',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogOpen = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      // Fetch details for the current tender
      fetchDetails()
    } else {
      // Reset to initial tender when closing
      setSelectedVersionId(versions[0]?.id || '')
      setCurrentTender(tender)
    }
  }

  const handleHighlight = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onHighlight) {
      onHighlight(tender.id, !tender.isHighlighted);
    }
  };

  const handleArchive = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onArchive) {
      onArchive(tender.id, !tender.isArchived);
    }
  }, [tender.id, tender.isArchived, onArchive]);

  // Update the currentVersion memo to include proper content
  const currentVersion = useMemo(() => {
    const selectedVersion = versions.find(v => v.id === selectedVersionId) || versions[0]
    // console.log('Selected Version:', {
    //   id: selectedVersion?.id,
    //   type: selectedVersion?.type,
    //   data: selectedVersion?.data
    // })

    if (!selectedVersion) {
      return {
        date: tender.date,
        brief: tender.brief,
        unit_name: tender.unit_name,
        type: tender.type
      }
    }

    // Use the version's data
    const versionData = selectedVersion.data
    // console.log('Version Data:', versionData)

    return {
      ...versionData,
      date: selectedVersion.date,
      type: selectedVersion.type,
      brief: versionData.brief || tender.brief,
      unit_name: versionData.unit_name || tender.unit_name
    }
  }, [versions, selectedVersionId, tender])

  // Add these debug logs in the version selection handler
  const handleVersionSelect = (versionId: string) => {
    // console.log('\n🔄 Version Selection:')
    // console.log('------------------------')
    // console.log('Selected Version ID:', versionId)
    
    const selectedVersion = versions.find(v => v.id === versionId)
    // console.log('Version Data:', {
    //   id: selectedVersion?.id,
    //   type: selectedVersion?.type,
    //   date: selectedVersion?.date,
    //   data: selectedVersion?.data
    // })

    setSelectedVersionId(versionId || versions[0].id)
    
    if (selectedVersion) {
      // console.log('Updating current tender with version data')
      setCurrentTender({
        ...tender,
        ...selectedVersion.data,
        type: selectedVersion.type
      })
    }
  }

  // Add debug log for layout determination
  const currentVersionForLayout = useMemo(() => {
    const selectedVersion = versions.find(v => v.id === selectedVersionId) || versions[0]
    // console.log('\n📑 Layout Determination:')
    // console.log('------------------------')
    // console.log('Current Version:', {
    //   id: selectedVersion?.id,
    //   type: selectedVersion?.type,
    //   data: selectedVersion?.data
    // })
    return selectedVersion
  }, [versions, selectedVersionId])

  //@ Extract award or failure data if available
  const awardData = currentVersion.enrichedData?.awardData;
  const failureData = currentVersion.enrichedData?.failureData;

  const handleCardOpen = () => {
    if (isNew) {
      markAsRead(tender.id);
    }
    handleDialogOpen(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
      >
        <Card 
          className={cn(
            "group relative cursor-pointer w-full h-[280px]",
            "hover:shadow-md transition-all duration-200",
            (isArchiving || isRemoving) && "animate-fade-out",
            tender.isHighlighted && "shadow-[0px_0px_8px_2px_rgba(250,204,21,0.5)] border-yellow-400",
            tender.isArchived && "opacity-75",
            isNew && "shadow-[0px_0px_12px_3px_rgba(59,130,246,0.3)] border-blue-400/50"
          )}
          onClick={handleCardOpen}
          data-tender-id={tender.job_number}
        >
          {versions.length > 1 && (
            <NotificationBadge count={versions.length} />
          )}
          <CardHeader className="flex-grow">
            <div className="flex-1 min-w-0">
              {isNew && (
                <div className="text-blue-500 text-xs font-medium mb-2 flex items-center">
                  <span className="h-2 w-2 rounded-full bg-blue-500 mr-1.5 animate-pulse"></span>
                  New
                </div>
              )}
              <CardTitle className="text-base font-medium line-clamp-2 mb-2">
                {tender.title}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">機關名稱:</span> {currentVersion.unit_name}
              </div>
              <div>
                <span className="font-medium">發佈種類:</span> {currentVersion.type}
              </div>
              <div>
                <span className="font-medium">發佈時間:</span>{" "}
                {formatTenderDate(Number(currentVersion.date))}
              </div>
            </div>
            {/* Show award data if available */}
            {awardData && (
              <div className="space-y-2">
                <p>決標金額: {awardData.totalAmount}</p>
                <p>得標廠商: {awardData.winner}</p>
                <p>決標日期: {awardData.awardDate}</p>
              </div>
            )}
            
            {/* Show failure data if available */}
            {failureData && (
              <div className="space-y-2">
                <p>無法決標原因: {failureData.reason}</p>
                <p>無法決標日期: {failureData.failureDate}</p>
                <p>後續處理: {failureData.nextAction}</p>
              </div>
            )}
          </CardContent>

          {/* Bottom section with tags and action buttons - now positioned absolutely */}
          <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between">
            {/* Tags on bottom left */}
            <div className="flex flex-wrap gap-2 flex-1 pb-1">
              {tender.tags?.length > 0 && tender.tags.map((tag: string) => {
                const tagColor = stringToColor(tag, 0.8, true);
                return (
                  <Badge 
                    key={tag} 
                    variant="outline"
                    className="text-[10px] text-white px-2 py-0.5 hover:bg-opacity-90 transition-colors"
                    style={{ 
                      backgroundColor: tagColor,
                      boxShadow: '2px 2px 2px 0px rgba(0,0,0,0.3)',
                      maxWidth: '90px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'inline-block',
                      paddingLeft: '8px',
                      paddingRight: '8px'
                    }}
                    title={tag}
                  >
                    # {tag}
                  </Badge>
                );
              })}
            </div>

            {/* Action buttons on bottom right */}
            <div className="flex gap-2">
              {/* Only show highlight button for non-archived tenders */}
              {onHighlight && !tender.isArchived && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="transition-opacity duration-200"
                  onClick={handleHighlight}
                  disabled={isHighlighting}
                  title={tender.isHighlighted ? "Remove Highlight" : "Highlight Tender"}
                >
                  <Star 
                    className={cn(
                      "h-4 w-4", 
                      tender.isHighlighted ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground",
                      isHighlighting && "animate-pulse"
                    )} 
                  />
                </Button>
              )}
              {onArchive && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="transition-opacity duration-200"
                  onClick={handleArchive}
                  disabled={isArchiving || isRemoving || tender.isHighlighted}
                  title={
                    tender.isHighlighted 
                      ? "Cannot archive highlighted tenders" 
                      : (tender.isArchived ? "Revert to Inbox" : "Archive Tender")
                  }
                >
                  {tender.isArchived ? (
                    <RotateCcw className={cn(
                      "h-4 w-4", 
                      (isArchiving || isRemoving) && "animate-bounce",
                      tender.isHighlighted && "opacity-50"
                    )} />
                  ) : (
                    <Archive className={cn(
                      "h-4 w-4", 
                      (isArchiving || isRemoving) && "animate-bounce",
                      tender.isHighlighted && "opacity-50"
                    )} />
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Dialog open={isOpen} onOpenChange={handleDialogOpen}>
          <DialogContent className="max-w-5xl aspect-[4/3] p-6 gap-0">
            {/* Fixed Header Section */}
            <div className="flex flex-col h-full">
              {/* Title and Version History */}
              <div>
                <div className="flex justify-between items-start">
                  <DialogTitle className="text-xl">{currentVersion.brief?.title}</DialogTitle>
                  
                  {/* Add action buttons */}
                  <div className="flex gap-2 pr-4">
                    {/* Only show highlight button for non-archived tenders */}
                    {onHighlight && !tender.isArchived && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={(e) => handleHighlight(e)}
                        disabled={isHighlighting}
                      >
                        <Star 
                          className={cn(
                            "h-4 w-4", 
                            tender.isHighlighted ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground",
                            isHighlighting && "animate-pulse"
                          )} 
                        />
                        <span>{tender.isHighlighted ? "Remove Highlight" : "Highlight"}</span>
                      </Button>
                    )}
                    
                    {onArchive && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={(e) => handleArchive(e)}
                        disabled={isArchiving || isRemoving || tender.isHighlighted}
                      >
                        {tender.isArchived ? (
                          <>
                            <RotateCcw className="h-4 w-4" />
                            <span>Revert to Inbox</span>
                          </>
                        ) : (
                          <>
                            <Archive className="h-4 w-4" />
                            <span>Archive</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                
                {versions.length > 0 && (
                  <div className="relative mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">版本歷程</span>
                      <div className="flex flex-wrap gap-2">
                        {versions.map((version) => (
                          <Button
                            key={version.id}
                            variant={selectedVersionId === version.id ? "default" : "outline"}
                            onClick={() => handleVersionSelect(version.id)}
                            size="sm"
                          >
                            {formatTenderDate(Number(version.date))} - {version.type}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="absolute top-[calc(100%+1.2rem)] h-[1px] w-full bg-border" />
                  </div>
                )}
              </div>

              {/* Content Section - Starts right after the line */}
              <div className="mt-8">
                {isLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-6">
                    {(() => {
                      const layoutType = getTenderLayout(currentVersionForLayout)
                      // console.log('Layout Type:', layoutType)

                      const LayoutComponent = {
                        bidding: BiddingLayout,
                        awarded: AwardedLayout,
                        failed: FailedBidLayout,
                        delivery: DeliveryLayout
                      }[layoutType]

                      return (
                        <>
                          <LayoutComponent 
                            record={currentVersionForLayout?.data} 
                            onArchive={onArchive}
                          />
                          {/* Right Column - Contact Info */}
                          <div className="col-span-4 space-y-4">
                            <div className="bg-muted/80 rounded-lg p-3">
                              <h3 className="font-semibold mb-2">聯絡資訊</h3>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <div className="text-muted-foreground">機關名稱</div>
                                  <div className="font-medium">
                                    {currentVersionForLayout?.data?.detail?.["機關資料:機關名稱"] || '未提供'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">單位名稱</div>
                                  <div className="font-medium">
                                    {currentVersionForLayout?.data?.detail?.["機關資料:單位名稱"] || '未提供'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">聯絡人</div>
                                  <div className="font-medium">
                                    {currentVersionForLayout?.data?.detail?.["機關資料:聯絡人"] || '未提供'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">聯絡電話</div>
                                  <div className="font-medium">
                                    {currentVersionForLayout?.data?.detail?.["機關資料:聯絡電話"] || '未提供'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">傳真號碼</div>
                                  <div className="font-medium">
                                    {currentVersionForLayout?.data?.detail?.["機關資料:傳真號碼"] || '未提供'}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {currentVersionForLayout?.data?.detail?.["url"] && (
                              <div className="flex justify">
                                <a 
                                  href={currentVersionForLayout.data.detail["url"]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex justify-center gap-2 px-4 py-2 text-sm bg-[gray]/50 rounded-lg hover:bg-[gray]/40 transition-colors w-full"
                                >
                                  <span>查看原始公告</span>
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AnimatePresence>
  )
} 