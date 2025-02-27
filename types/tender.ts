export interface TenderBrief {
  type: string;
  title: string;
  category?: string;
  companies?: {
    ids: string[];
    names: string[];
    id_key: Record<string, string[]>;
    name_key: Record<string, string[]>;
  };
  content?: string;
}

export interface TenderRecord {
  unit_id: string
  job_number: string
  [key: string]: any  // For other fields from the API
}

export interface APIResponse {
  records: TenderRecord[]
  [key: string]: any
}

export interface Tender {
  id: string
  unit_id: string
  job_number: string
  records?: TenderRecord[]
  [key: string]: any
}

export interface TenderGroup {
  tender: Tender;
  versions: TenderVersion[];
  isArchived: boolean;
  relatedTenders?: Tender[];
}

export interface TenderVersion {
  date: number;
  type: string;
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

export interface TenderDetail {
  type: string;
  url: string;
  detail: Record<string, any>;
  fetched_at: string;
  // ... add other detail fields as needed
} 