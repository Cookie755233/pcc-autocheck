"use client"

import { useState } from "react"
import { KeywordPanel } from "./keyword-panel"
import { TenderBoard } from "./tender-board"
import { Tender, TenderGroup } from "@/types/tender"

export function DashboardClient() {
  const [tenders, setTenders] = useState<TenderGroup[]>([])

  const handleTendersFound = (newTenders: TenderGroup[]) => {
    console.log('New tenders found:', newTenders.length);
    
    // Process the new tenders to ensure they have required properties
    const processedTenders = newTenders.map(group => {
      return {
        ...group,
        tender: {
          ...group.tender,
          isArchived: group.tender.isArchived || false,
        },
        versions: group.versions || [],
        relatedTenders: group.relatedTenders || []
      };
    });
    
    // Merge with existing tenders instead of replacing
    setTenders(prevTenders => {
      console.log('Previous tenders:', prevTenders.length);
      
      // Create a map of existing tenders by job number for quick lookup
      const existingTendersMap = new Map(
        prevTenders.map(t => [t.tender.job_number, t])
      );
      
      // Add new tenders to the map, replacing existing ones
      processedTenders.forEach(tender => {
        existingTendersMap.set(tender.tender.job_number, tender);
      });
      
      // Convert map back to array
      const mergedTenders = Array.from(existingTendersMap.values());
      console.log('Merged tenders:', mergedTenders.length);
      
      return mergedTenders;
    });
  }

  const handleArchive = (tender: Tender) => {
    setTenders(current =>
      current.map(group =>
        group.tender.job_number === tender.job_number
          ? {
              ...group,
              tender: { 
                ...group.tender, 
                isArchived: true,
                archived: true 
              },
              relatedTenders: (group.relatedTenders || []).map(t => ({ 
                ...t, 
                isArchived: true,
                archived: true 
              }))
            }
          : group
      )
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
      <div>
        <KeywordPanel 
          className="sticky top-4" 
          onTendersFound={handleTendersFound}
        />
      </div>
      <div>
        <TenderBoard 
          initialTenders={tenders} 
          onArchive={handleArchive}
        />
      </div>
    </div>
  )
} 