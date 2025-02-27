type TenderEventDetail = {
  tender: any;
  versions: any[];
  isNew: boolean;
  newVersions: number;
}

export class TenderEvent extends CustomEvent<TenderEventDetail> {
  constructor(tender: TenderEventDetail) {
    super('newTenderFound', { 
      detail: tender,
      bubbles: true 
    });
  }
}

export class SearchCompleteEvent extends CustomEvent<{ count: number }> {
  constructor(count: number) {
    super('searchComplete', { 
      detail: { count },
      bubbles: true 
    });
  }
}

declare global {
  interface WindowEventMap {
    'newTenderFound': TenderEvent;
    'searchComplete': SearchCompleteEvent;
  }
} 