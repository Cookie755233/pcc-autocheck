import { TenderVersion } from '@/types/tender'

// Base interface for all layouts
export interface TenderLayoutProps {
  record: any;
  onArchive?: (tender: any) => void;
}

// Helper to determine which layout to use
export function getTenderLayout(version: TenderVersion) {
  if (!version?.type) return 'bidding';
  
  // console.log('Determining layout for type:', version.type);
  
  const type = version.type.toLowerCase();
  if (type.includes('無法決標')) {
    return 'failed';
  } 
  if (type.includes('決標')) {
    return 'awarded';
  } 
  if (type.includes('彙送')) {
    return 'delivery';
  }
  return 'bidding';
}
