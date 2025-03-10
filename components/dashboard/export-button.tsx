"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check, FileText, FileJson, AlertCircle, AlertTriangle } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Tender, TenderGroup } from "@/types/tender";
import { toast } from "@/components/ui/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { TenderCard } from "@/components/dashboard/tender-card";
import ReactDOM from "react-dom/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSubscription } from '@/lib/contexts/subscription-context';
import { useToast } from "@/components/ui/use-toast";

// Create a custom FilePdf icon since it might not be available in lucide-react
const FilePdf = (props: any) => (
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
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M8 11v6" />
  </svg>
);

interface ExportButtonProps {
  tenders: TenderGroup[];
  className?: string;
}

export function ExportButton({ tenders, className }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "text" | "pdf">("json");
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [totalExportItems, setTotalExportItems] = useState(0);
  const [isProPlan, setIsProPlan] = useState(false);
  const { toast } = useToast();
  
  // Use the subscription context instead of making a direct API call
  const { subscriptionTier } = useSubscription();

  // Update to use subscription context data
  useEffect(() => {
    // Set pro plan status based on subscription context
    setIsProPlan(subscriptionTier === 'pro');
  }, [subscriptionTier]);

  // Add back the helper function to check if the current format requires pro plan
  const requiresProPlan = () => {
    return (exportFormat === "text" || exportFormat === "pdf") && !isProPlan;
  };

  //@ Formats date from YYYYMMDD to MM/DD format with optional year
  const formatDate = (dateNum: number | undefined, includeYear: boolean = false): string => {
    if (!dateNum) return "";
    try {
      const dateStr = dateNum.toString();
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6));
      const day = parseInt(dateStr.substring(6, 8));
      
      return includeYear ? `${year}/${month}/${day}` : `${month}/${day}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  //@ Gets Chinese day of week
  const getChineseDayOfWeek = (dateNum: number | undefined): string => {
    if (!dateNum) return "";
    try {
      const dateStr = dateNum.toString();
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // 0-indexed month
      const day = parseInt(dateStr.substring(6, 8));
      
      const date = new Date(year, month, day);
      const dayOfWeek = format(date, 'E', { locale: zhTW });
      return `(${dayOfWeek})`;
    } catch (error) {
      console.error("Error getting day of week:", error);
      return "";
    }
  };

  //@ Generates text preview for tenders
  const generateTextPreview = (): string => {
    if (tenders.length === 0) return "無相關招標案";
    
    // Group tenders by date
    const tendersByDate = new Map<string, TenderGroup[]>();
    
    tenders.forEach(tender => {
      const dateKey = formatDate(tender.tender.date);
      if (!tendersByDate.has(dateKey)) {
        tendersByDate.set(dateKey, []);
      }
      tendersByDate.get(dateKey)?.push(tender);
    });
    
    //* Generate text content
    // Get today's date formatted as YYYY/MM/DD and Chinese day of week
    const today = new Date();
    const formattedToday = format(today, 'yyyy/MM/dd', { locale: zhTW });
    const todayDayOfWeek = format(today, 'E', { locale: zhTW });
    
    // Add today's date header
    let content = `${formattedToday} (${todayDayOfWeek}) 招標公告\n`;

    // Sort dates
    const sortedDates = Array.from(tendersByDate.keys()).sort((a, b) => {
      const [aMonth, aDay] = a.split('/').map(Number);
      const [bMonth, bDay] = b.split('/').map(Number);
      if (aMonth !== bMonth) return aMonth - bMonth;
      return aDay - bDay;
    });
    
    sortedDates.forEach(date => {
      const dayTenders = tendersByDate.get(date) || [];
      if (dayTenders.length === 0) return;
      
      // Group by tags
      const tendersByTag = new Map<string, TenderGroup[]>();
      
      dayTenders.forEach(tender => {
        const tags = Array.isArray(tender.tender.tags) ? tender.tender.tags : [];
        
        if (tags.length === 0) {
          // Handle tenders with no tags
          if (!tendersByTag.has("未分類")) {
            tendersByTag.set("未分類", []);
          }
          tendersByTag.get("未分類")?.push(tender);
        } else {
          // Add tender to each of its tags
          tags.forEach(tag => {
            if (!tendersByTag.has(tag)) {
              tendersByTag.set(tag, []);
            }
            tendersByTag.get(tag)?.push(tender);
          });
        }
      });
      
      // Process each tag group
      Array.from(tendersByTag.keys()).forEach((tag, tagIndex) => {
        const tagTenders = tendersByTag.get(tag) || [];
        
        content += `\n👉 ${tag}\n`;
        
        if (tagTenders.length === 0) {
          content += "無相關招標案\n";
        } else {
          tagTenders.forEach((tender, tenderIndex) => {
            const tenderData = tender.tender;
            
            //? publish date text
            const publishDateText = tenderData.date? `(${formatDate(tenderData.date, true)}公告)` : "";

            //? deadline date text (check all versions)
            let deadlineDate = "";
            if (tender.versions && tender.versions.length > 0) {
              // Check all versions for deadline date
              for (const version of tender.versions) {
                const deadlineInfo = version.data?.detail?.["領投開標:截止投標"];
                if (deadlineInfo) {
                  deadlineDate = deadlineInfo;
                  break; // Use the first one found
                }
              }
            }
            const deadlineText = deadlineDate ? `(${deadlineDate}截止)` : "";
            
            // Add tender publish/deadline info to content
            content += `${tenderIndex + 1}. ${tenderData.title} ${publishDateText} ${deadlineText}`;
            
            // Add URL if available (check all versions)
            if (tender.versions && tender.versions.length > 0) {
              // Get the URL from the first version that has one
              let primaryUrl = null;
              
              // First try to find a URL in any version
              for (const version of tender.versions) {
                const versionUrl = version.enrichedData?.url || version.data?.detail?.url;
                if (versionUrl) {
                  primaryUrl = versionUrl;
                  break;
                }
              }
              
              // Add the primary URL to the content
              if (primaryUrl) {
                content += `\n${primaryUrl}`;
                
                // Count how many other versions have different URLs
                // const otherVersionsWithUrls = tender.versions.filter(v => {
                //   const vUrl = v.enrichedData?.url || v.data?.detail?.url;
                //   return vUrl && vUrl !== primaryUrl;
                // }).length;

                // // If there are other versions with different URLs, mention them
                // if (otherVersionsWithUrls > 0) {
                //   content += `\n(另有 ${otherVersionsWithUrls - 1} 個版本)`;
                // }
              }
            }
            
            content += "\n";
          });
        }
      });
      
      content += "\n";
    });
    
    return content;
  };

  //@ Exports tenders to JSON format
  const exportToJson = () => {
    try {
      setIsExporting(true);
      //? Create a JSON string from the tenders array
      const jsonString = JSON.stringify(tenders, null, 2);
      //? Create a blob with the JSON data
      const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
      //? Create a download link and trigger it
      downloadFile(blob, "tenders.json");
      console.log("Exported tenders to JSON:", tenders.length);
      setIsOpen(false);
    } catch (error) {
      console.error("Error exporting to JSON:", error);
    } finally {
      setIsExporting(false);
    }
  };

  //@ Exports tenders to text format
  const exportToText = () => {
    try {
      setIsExporting(true);
      //? Create a text representation based on the specified format
      const textContent = generateTextPreview();
      
      //? Create a blob with the text data
      const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
      //? Create a download link and trigger it
      downloadFile(blob, "tenders.txt");
      console.log("Exported tenders to text:", tenders.length);
      setIsOpen(false);
    } catch (error) {
      console.error("Error exporting to text:", error);
    } finally {
      setIsExporting(false);
    }
  };

  //@ Exports tenders to PDF format
  const exportToPdf = async () => {
    try {
      setIsExporting(true);
      setTotalExportItems(tenders.length);
      setExportProgress(0);
      console.log("Starting PDF export for", tenders.length, "tenders");
      
      //? Tweakable parameters for performance
      const scale = 1.5; // Lower for faster export, higher for better quality
      const quality = 0.8; // Lower for faster export (0.5-0.8 recommended)
      
      // Create a new PDF document
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      console.log("PDF dimensions:", pdfWidth, "x", pdfHeight, "mm");
      
      // Create a temporary container for rendering cards
      const container = document.createElement('div');
      container.style.width = '800px';
      container.style.padding = '20px';
      container.style.backgroundColor = 'white';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);
      
      let currentPage = 1;
      let totalPages = 0;
      
      // First, calculate total pages
      for (const tender of tenders) {
        // Count main tender page
        totalPages++;
        // Count each version page
        if (tender.versions && tender.versions.length > 0) {
          totalPages += tender.versions.length - 1; // -1 because first version is shown with main tender
        }
      }
      
      console.log(`Total pages to generate: ${totalPages}`);
      
      // Import the layout components
      const { getTenderLayout, BiddingLayout, AwardedLayout, FailedBidLayout, DeliveryLayout } = await import('./tender-layouts');
      
      // Process each tender
      for (let i = 0; i < tenders.length; i++) {
        const tender = tenders[i];
        console.log(`Processing tender ${i+1}/${tenders.length}:`, tender.tender.title);
        
        // Process each version of the tender
        for (let j = 0; j < (tender.versions?.length || 1); j++) {
          // If not the first page, add a new page
          if (currentPage > 1) {
            pdf.addPage();
          }
          
          // Get the current version - ensure we properly access all data
          const currentVersion = tender.versions?.[j] || {
            date: '',
            type: '',
            data: { brief: {}, detail: {} },
            enrichedData: {}
          };
          
          // Debug log to see what data we have
          console.log(`Version ${j+1} data:`, currentVersion);
          
          // Create a div to hold the expanded tender content
          const cardContainer = document.createElement('div');
          cardContainer.style.width = '800px';
          cardContainer.style.height = 'auto';
          cardContainer.style.overflow = 'hidden';
          cardContainer.style.backgroundColor = 'white';
          cardContainer.style.padding = '20px';
          cardContainer.style.borderRadius = '8px';
          cardContainer.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          
          // Clear the container and add the new card container
          container.innerHTML = '';
          container.appendChild(cardContainer);
          
          // Determine which layout to use based on the tender type
          const layoutType = getTenderLayout(currentVersion);
          console.log(`Using layout type: ${layoutType} for tender ${i+1}, version ${j+1}`);
          
          // Create a custom expanded version of the tender card using the appropriate layout
          const ExpandedTenderCard = () => {
            // Extract data for display
            const title = tender.tender.title || 'Untitled';
            const date = formatDate(tender.tender.date, true);
            
            // Ensure we're accessing the data correctly
            const orgName = 
              currentVersion.enrichedData?.unit_name || 
              currentVersion.data?.detail?.["機關資料:機關名稱"] || 
              currentVersion.data?.unit_name ||
              'N/A';
              
            const unitName = 
              currentVersion.data?.detail?.["機關資料:單位名稱"] || 
              currentVersion.data?.unit_name ||
              'N/A';
              
            const contact = 
              currentVersion.data?.detail?.["機關資料:聯絡人"] || 
              currentVersion.data?.contact ||
              'N/A';
              
            const phone = 
              currentVersion.data?.detail?.["機關資料:聯絡電話"] || 
              currentVersion.data?.phone ||
              'N/A';
              
            const fax = 
              currentVersion.data?.detail?.["機關資料:傳真號碼"] || 
              currentVersion.data?.fax ||
              'N/A';
            
            // Select the appropriate layout component
            const LayoutComponent = {
              bidding: BiddingLayout,
              awarded: AwardedLayout,
              failed: FailedBidLayout,
              delivery: DeliveryLayout
            }[layoutType];
            
            return (
              <div className="p-6 bg-white rounded-lg">
                {/* Header */}
                <div className="mb-6">
                  <h1 className="text-xl font-bold mb-2">{title}</h1>
                  <div className="flex justify-between text-gray-500 text-sm">
                    <div>ID: {tender.tender.id}</div>
                    <div>發布日期: {date}</div>
                  </div>
                  <div className="mt-2 text-blue-600 font-medium text-sm">
                    版本 {j+1}: {currentVersion.type} ({formatDate(Number(currentVersion.date), true)})
                  </div>
                </div>
                
                {/* Main content in two columns */}
                <div className="grid grid-cols-12 gap-6">
                  {/* Use the appropriate layout component */}
                  <LayoutComponent 
                    record={currentVersion.data} 
                    onArchive={() => {}}
                  />
                  
                  {/* Right Column - Contact Info */}
                  <div className="col-span-4 space-y-4">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <h3 className="font-semibold mb-2 text-sm">聯絡資訊</h3>
                      <div className="space-y-2 text-xs">
                        <div>
                          <div className="text-gray-500">機關名稱</div>
                          <div className="font-medium">{orgName}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">單位名稱</div>
                          <div className="font-medium">{unitName}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">聯絡人</div>
                          <div className="font-medium">{contact}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">聯絡電話</div>
                          <div className="font-medium">{phone}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">傳真號碼</div>
                          <div className="font-medium">{fax}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          };
          
          // Render the expanded card
          const root = ReactDOM.createRoot(cardContainer);
          root.render(<ExpandedTenderCard />);
          
          // Wait for the card to render
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            // Capture the rendered card
            console.log(`Capturing tender ${i+1}, version ${j+1}`);
            const canvas = await html2canvas(cardContainer, {
              scale: scale, // Higher scale for better quality
              logging: false,
              useCORS: true,
              allowTaint: true,
              quality: quality // Add this parameter
            });
            
            // Convert canvas to image
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            
            // Calculate dimensions to fit the page
            const cardWidth = canvas.width;
            const cardHeight = canvas.height;
            
            // Calculate ratio to fit the page with margins
            const ratio = Math.min((pdfWidth - 20) / cardWidth, (pdfHeight - 30) / cardHeight);
            const scaledWidth = cardWidth * ratio;
            const scaledHeight = cardHeight * ratio;
            
            // Add the image to the PDF
            pdf.addImage(
              imgData, 
              'JPEG', 
              (pdfWidth - scaledWidth) / 2, // Center horizontally
              10, // Top margin
              scaledWidth, 
              scaledHeight
            );
            
            // Get URL from the current version
            const url = currentVersion.data?.detail?.["url"] || 
                        currentVersion.enrichedData?.url || 
                        currentVersion.data?.url || 
                        '';
            
            // Create a footer container that will hold just the URL
            const footerContainer = document.createElement('div');
            footerContainer.style.display = 'flex';
            footerContainer.style.justifyContent = 'flex-start';
            footerContainer.style.alignItems = 'center';
            footerContainer.style.width = '700px';
            footerContainer.style.padding = '20px 10px';
            footerContainer.style.backgroundColor = 'white';
            footerContainer.style.minHeight = 'fit-content';
            footerContainer.style.position = 'relative';
            footerContainer.style.minHeight = '60px'; // Added fixed minimum height

            // Create URL element
            if (url) {
              const urlElement = document.createElement('div');
              urlElement.style.fontFamily = 'Arial, "Microsoft JhengHei", sans-serif';
              urlElement.style.fontSize = '12px';
              urlElement.style.color = '#666';
              urlElement.style.textAlign = 'left';
              urlElement.style.maxWidth = '600px';
              urlElement.style.lineHeight = '1.5'; // Added line height
              urlElement.style.wordBreak = 'break-all'; // Added word break
              urlElement.style.paddingRight = '20px'; // Added right padding
              urlElement.style.flex = '1'; // Added flex grow
              
              // Add a line break after "原始資料連結:" to prevent the URL from breaking
              const labelSpan = document.createElement('div');
              labelSpan.textContent = '原始資料連結:';
              labelSpan.style.fontWeight = 'bold';
              labelSpan.style.marginBottom = '5px';
              
              const urlSpan = document.createElement('div');
              urlSpan.textContent = url;
              urlSpan.style.wordBreak = 'break-all';
              
              urlElement.appendChild(labelSpan);
              urlElement.appendChild(urlSpan);
              
              footerContainer.appendChild(urlElement);
            }

            // Only append to document if we have a URL
            if (url) {
              // Append to document temporarily
              document.body.appendChild(footerContainer);
              
              // Capture the footer as an image with high resolution
              const footerCanvas = await html2canvas(footerContainer, {
                scale: scale, // Higher scale for better quality
                logging: false,
                backgroundColor: null,
                quality: quality // Add this parameter
              });
              
              // Remove the temporary element
              document.body.removeChild(footerContainer);
              
              // Convert to image
              const footerImgData = footerCanvas.toDataURL('image/png');
              
              // Add footer at the bottom
              pdf.addImage(
                footerImgData,
                'PNG',
                20, // Left margin
                pdfHeight - 30, // Increased bottom margin
                pdfWidth - 20, // Width
                20 // Increased height
              );
            }
            
            console.log(`Added tender ${i+1}, version ${j+1} to PDF (page ${currentPage}/${totalPages})`);
            currentPage++;
            setExportProgress(currentProgress => currentProgress + 1);
          } catch (error) {
            console.error(`Error processing tender ${i+1}, version ${j+1}:`, error);
          }
        }
      }
      
      // Clean up
      document.body.removeChild(container);
      
      // Save the PDF
      pdf.save(
        `${new Date().toLocaleDateString('zh-TW', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit'
        }).replace(/\//g, '')}-tenders.pdf`
      );
      console.log(`Successfully exported ${tenders.length} tenders to PDF (${totalPages} pages total)`);
      toast({
        title: "PDF Export Complete",
        description: `Successfully exported ${tenders.length} tenders (${totalPages} pages) to PDF.`,
        variant: "success"
      });
      setIsOpen(false);
      
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast({
        title: "PDF Export Failed",
        description: "There was an error creating the PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  //@ Helper function to trigger file download
  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  //@ Handles export based on selected format
  const handleExport = () => {
    if (exportFormat === "json") {
      exportToJson();
    } else if (exportFormat === "text") {
      exportToText();
    } else if (exportFormat === "pdf") {
      exportToPdf();
    }
  };

  //@ Copies content to clipboard
  const copyToClipboard = () => {
    try {
      let content = "";
      
      if (exportFormat === "json") {
        content = JSON.stringify(tenders, null, 2);
      } else if (exportFormat === "text") {
        content = generateTextPreview();
      }
      
      navigator.clipboard.writeText(content).then(() => {
        setIsCopied(true);
        toast({
          title: "Copied to clipboard",
          description: `${tenders.length} tenders copied in ${exportFormat.toUpperCase()} format`,
          variant: "default"
        });
        
        // Reset the copied state after 2 seconds
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      });
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast({
        title: "Copy Failed",
        description: "There was an error copying to clipboard. Please try again.",
        variant: "destructive"
      });
    }
  };

  //@ Generates a preview of the JSON export
  const jsonPreview = () => {
    if (tenders.length === 0) return "No tenders to export";
    
    // Show only first 3 tenders for preview
    const previewTenders = tenders.slice(0, 3);
    return JSON.stringify(previewTenders, null, 2);
  };

  //@ Generates a preview of the text export
  const textPreview = () => {
    return generateTextPreview();
  };

  // Replace the pdfPreviewImage line with this SVG component
  const PdfPreviewSvg = () => (
    <svg
      width="400"
      height="500"
      viewBox="0 0 400 500"
      xmlns="http://www.w3.org/2000/svg"
      className="border rounded shadow-sm"
    >
      {/* PDF page background */}
      <rect width="400" height="500" fill="white" />
      
      {/* Header */}
      <rect x="30" y="30" width="340" height="60" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
      <text x="50" y="55" fontFamily="Arial" fontSize="16" fontWeight="bold" fill="#1e293b">ＯＯＯ政府ＯＯＯ採購案</text>
      <text x="50" y="75" fontFamily="Arial" fontSize="12" fill="#64748b">發布日期: ＯＯＯＯ/ＯＯ/ＯＯ  |  預算金額: ＯＯＯ元</text>
      
      {/* Contact info section */}
      <rect x="30" y="110" width="340" height="120" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
      <text x="50" y="135" fontFamily="Arial" fontSize="14" fontWeight="bold" fill="#1e293b">聯絡資訊</text>
      <text x="50" y="160" fontFamily="Arial" fontSize="12" fill="#334155"><tspan fontWeight="bold">機關名稱:</tspan> ＯＯＯ政府</text>
      <text x="50" y="180" fontFamily="Arial" fontSize="12" fill="#334155"><tspan fontWeight="bold">單位名稱:</tspan> ＯＯＯ處</text>
      <text x="50" y="200" fontFamily="Arial" fontSize="12" fill="#334155"><tspan fontWeight="bold">聯絡人:</tspan> ＯＯＯ</text>
      <text x="50" y="220" fontFamily="Arial" fontSize="12" fill="#334155"><tspan fontWeight="bold">聯絡電話:</tspan> (ＯＯ)ＯＯＯ-ＯＯＯＯ</text>
      
      {/* Link */}
      <text x="360" y="220" fontFamily="Arial" fontSize="12" fill="#3b82f6" textAnchor="end" textDecoration="underline">查看原始公告</text>
      
      {/* Version section */}
      <rect x="30" y="250" width="340" height="80" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
      <text x="50" y="275" fontFamily="Arial" fontSize="14" fontWeight="bold" fill="#1e293b">版本資訊</text>
      <text x="50" y="295" fontFamily="Arial" fontSize="12" fill="#334155"><tspan fontWeight="bold">類型:</tspan>ＯＯＯＯ</text>
      <text x="50" y="315" fontFamily="Arial" fontSize="12" fill="#334155"><tspan fontWeight="bold">截止日期:</tspan>ＯＯＯ/ＯＯＯＯ</text>
      
      {/* Footer */}
      <text x="200" y="480" fontFamily="Arial" fontSize="10" fill="#64748b" textAnchor="middle">Page 1 of 1</text>
    </svg>
  );

  // Format descriptions for each export type
  const formatDescriptions = {
    json: "Exports all tender data in JSON format, including all metadata and related information. Useful for data analysis or importing into other systems.",
    text: "Exports tenders in a readable text format organized by date and tag. Includes titles, publication dates, deadlines, and URLs. Ideal for sharing or printing.",
    pdf: "Exports tenders as a formatted PDF document with proper layout and styling. Each tender and its versions will be exported as separate pages in the PDF.",
    pdfWarning: "Exports will only work in light mode. Dark mode is not supported."
  };

  // Get the appropriate icon for the current format
  const getFormatIcon = () => {
    switch (exportFormat) {
      case "json":
        return <FileJson className="mr-2 h-4 w-4" />;
      case "text":
        return <FileText className="mr-2 h-4 w-4" />;
      case "pdf":
        return <FilePdf className="mr-2 h-4 w-4" />;
      default:
        return <Download className="mr-2 h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={isExporting || tenders.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Export Tenders</DialogTitle>
          <DialogDescription className="mx-auto max-w-[80%] text-base text-center">
            Export <span className="text-blue-500 font-bold text-lg mx-1">{tenders.length}</span> tenders in your preferred format.
            {tenders.length > 20 && exportFormat === "pdf" && (
              <span className="text-red-500 text-sm mx-1 flex items-center justify-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Warning: Large amount of tenders may take a while.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="w-full border-t mb-4"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 w-[90%] mx-auto">
          <div className="space-y-4 md:col-span-4">
            <Tabs 
              defaultValue="json" 
              onValueChange={(value) => setExportFormat(value as "json" | "text" | "pdf")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 mb-4 rounded-md">
                <TabsTrigger value="json">JSON</TabsTrigger>
                <TabsTrigger value="text">Text</TabsTrigger>
                <TabsTrigger value="pdf">PDF</TabsTrigger>
              </TabsList>
              
              <TabsContent value="json" className="ml-2 mt-6">
                <div className="text-sm text-muted-foreground">
                  {formatDescriptions.json}
                </div>
              </TabsContent>
              
              <TabsContent value="text" className="ml-2 mt-6">
                <div className="text-sm text-muted-foreground">
                  {formatDescriptions.text}
                </div>
                {!isProPlan && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Text export requires a Pro subscription. <a href="/dashboard/settings" className="underline font-medium">Upgrade now</a> to unlock this feature.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
              
              <TabsContent value="pdf" className="ml-2 mt-6">
                <div className="text-sm text-muted-foreground">
                  {formatDescriptions.pdf}
                </div>
                <div className="text-sm text-bold underline">
                  {formatDescriptions.pdfWarning}
                </div>
                {!isProPlan && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      PDF export requires a Pro subscription. <a href="/dashboard/settings" className="underline font-medium">Upgrade now</a> to unlock this feature.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="space-y-2 md:col-span-8">
            <div className="text-base font-medium">Preview:</div>
            <div className="h-[300px] w-full rounded-md border p-4 bg-muted overflow-auto">
              {requiresProPlan() ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Pro Feature</h3>
                  <p className="text-sm text-center mb-4">
                    {exportFormat === "text" ? "Text" : "PDF"} export is available with Pro subscription
                  </p>
                  <a 
                    href="/dashboard/settings" 
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Upgrade to Pro
                  </a>
                </div>
              ) : exportFormat === "json" ? (
                <pre className="text-xs" style={{ whiteSpace: 'pre' }}>
                  {jsonPreview()}
                </pre>
              ) : exportFormat === "text" ? (
                <pre className="text-xs" style={{ whiteSpace: 'pre' }}>
                  {textPreview()}
                </pre>
              ) : (
                <div className="flex flex-col items-center">
                  <PdfPreviewSvg />
                  <p className="text-xs text-center mt-2 font-light text-gray-500">
                    Each tender will be exported as a separate page in the PDF, <br />formatted as shown above.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="w-full border-t my-4"></div>
        
        <div className="flex justify-center gap-4">
          <Button 
            onClick={handleExport} 
            disabled={isExporting || tenders.length === 0 || requiresProPlan()}
            className="px-8"
          >
            {getFormatIcon()}
            {isExporting 
              ? "Exporting..." 
              : requiresProPlan() 
                ? `${exportFormat.toUpperCase()} (Pro Only)` 
                : `Export as ${exportFormat.toUpperCase()}`
            }
          </Button>
          
          {(exportFormat === "json" || exportFormat === "text") && (
            <Button 
              variant="outline" 
              onClick={copyToClipboard} 
              disabled={isExporting || tenders.length === 0 || isCopied || requiresProPlan()}
              className="px-8"
            >
              {isCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {isCopied 
                ? "Copied!" 
                : requiresProPlan() 
                  ? "Copy (Pro Only)" 
                  : "Copy to Clipboard"
              }
            </Button>
          )}
        </div>

        {isExporting && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Exporting tenders...</span>
              <span>{Math.round((exportProgress / totalExportItems) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out" 
                style={{ width: `${(exportProgress / totalExportItems) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {exportProgress} of {totalExportItems} tenders processed
            </p>
          </div>
        )}
      </DialogContent>
      
      {/* Hidden container for PDF rendering */}
      <div 
        ref={pdfContainerRef} 
        className="hidden"
        style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
      >
        {tenders.map((group, groupIndex) => (
          <div key={`pdf-group-${groupIndex}`} className="pdf-tender-card mb-8 p-4 bg-white rounded-lg border">
            <h2 className="text-xl font-bold mb-2">{group.tender.title}</h2>
            <p className="text-sm text-gray-500 mb-4">
              Published: {formatDate(group.tender.date)} | 
              ID: {group.tender.id}
            </p>
            
            {group.versions && group.versions.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Versions ({group.versions.length})</h3>
                {group.versions.map((version, vIndex) => (
                  <div key={`pdf-version-${vIndex}`} className="mb-4 p-3 bg-gray-50 rounded border">
                    <p className="font-medium">Version {vIndex + 1} - {version.type}</p>
                    <p className="text-sm">Date: {formatDate(Number(version.date))}</p>
                    
                    {version.data?.brief && (
                      <div className="mt-2">
                        <p><strong>Brief:</strong> {version.data.brief.title}</p>
                        <p><strong>Type:</strong> {version.data.brief.type}</p>
                      </div>
                    )}
                    
                    {version.enrichedData?.url && (
                      <p className="text-sm mt-2">
                        <strong>URL:</strong> {version.enrichedData.url}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {group.relatedTenders && group.relatedTenders.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Related Tenders ({group.relatedTenders.length})</h3>
                {group.relatedTenders.map((related, rIndex) => (
                  <div key={`pdf-related-${rIndex}`} className="mb-2">
                    <p>{related.title || 'Untitled Tender'}</p>
                    <p className="text-sm text-gray-500">ID: {related.id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Dialog>
  );
} 