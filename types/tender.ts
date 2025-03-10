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
  unit_id: string;
  job_number: string;
  date?: string | number;
  brief?: any;
  [key: string]: any; // For other fields from the API
}

export interface APIResponse {
  records: TenderRecord[];
  [key: string]: any;
}

export interface Tender {
  id: string;
  unit_id: string;
  job_number: string;
  date: number;
  title: string;
  type?: string;
  startDate?: string | number;
  endDate?: string | number;
  isArchived: boolean;
  isHighlighted: boolean;
  isNew?: boolean;
  tags?: string[];
  brief?: {
    title?: string;
    type?: string;
    [key: string]: any;
  };
  // Added for API integration
  records?: TenderRecord[];
  keyword?: string; // Track which keyword found this tender
}

export interface TenderGroup {
  tender: Tender;
  versions: TenderVersion[];
  relatedTenders: Tender[];
}

export interface TenderVersion {
  id?: string;
  date: string | number;
  type: string;
  data: {
    brief?: {
      title?: string;
      type?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  enrichedData?: {
    awardData?: any;
    failureData?: any;
    [key: string]: any;
  };
}

export interface TenderDetail {
  type: string;
  url: string;
  detail: Record<string, any>;
  fetched_at: string;
  // ... add other detail fields as needed
}
