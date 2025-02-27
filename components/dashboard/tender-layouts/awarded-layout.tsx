import { TenderLayoutProps } from './tender-layout'

interface VendorFields {
  [key: string]: string | undefined
}

interface Companies {
  ids?: string[]
  names?: string[]
  addresses?: string[]
  phones?: string[]
  periods?: string[]
  id_key?: {
    [key: string]: string[]
  }
  name_key?: {
    [key: string]: string[]
  }
}

export function AwardedLayout({ record }: TenderLayoutProps) {
  // Detailed debug logging to understand the data structure
  // console.log('🔍 Award Layout - Full Record:', record);
  // console.log('🔍 Award Layout - Detail:', record?.detail);
  
  // Extract vendor fields from detail
  const detail = record?.detail || {}
  
  // Get all companies data first
  const allCompanies = (
    record?.companies || 
    record?.detail?.companies || 
    record?.enrichedData?.awardData?.companies || 
    {}
  ) as Companies;
  
  // Log all keys that start with 投標廠商 to see what's available
  const bidderKeys = Object.keys(detail).filter(key => key.startsWith('投標廠商:'));
  // console.log('🔍 Award Layout - Bidder Keys:', bidderKeys);
  
  const vendorFields = Object.entries(detail)
    .filter(([key]) => key.startsWith('投標廠商:'))
    .reduce<VendorFields>((acc, [key, value]) => ({ 
      ...acc, 
      [key]: value as string 
    }), {})
  
  // Find winning vendor indices
  const winningIndices: number[] = [];
  
  for (let i = 1; i <= 10; i++) {
    const nameKey = `投標廠商:投標廠商${i}:廠商名稱`;
    const isWinnerKey = `投標廠商:投標廠商${i}:是否得標`;
    
    if (detail[nameKey] && detail[isWinnerKey] === '是') {
      winningIndices.push(i - 1); // Convert to 0-based index
    }
  }
  
  // console.log('🔍 Award Layout - Winning Indices:', winningIndices);
  
  // Create a new companies object with only winning vendors
  const companies: Companies = {
    ids: [],
    names: [],
    addresses: [],
    phones: [],
    periods: [],
    id_key: {},
    name_key: {}
  };
  
  // If we found winning indices, filter the companies data
  if (winningIndices.length > 0 && allCompanies.names?.length) {
    winningIndices.forEach(index => {
      if (index < allCompanies.names.length) {
        companies.names.push(allCompanies.names[index]);
        companies.ids.push(allCompanies.ids?.[index] || '');
        companies.addresses.push(allCompanies.addresses?.[index] || '');
        companies.phones.push(allCompanies.phones?.[index] || '');
        companies.periods.push(allCompanies.periods?.[index] || '');
        
        const name = allCompanies.names[index];
        const id = allCompanies.ids?.[index];
        
        if (name && allCompanies.name_key?.[name]) {
          companies.name_key[name] = allCompanies.name_key[name];
        }
        
        if (id && allCompanies.id_key?.[id]) {
          companies.id_key[id] = allCompanies.id_key[id];
        }
      }
    });
  } else if (Object.keys(detail).length > 0) {
    // If no winning indices found, extract directly from detail
    for (let i = 1; i <= 10; i++) {
      const nameKey = `投標廠商:投標廠商${i}:廠商名稱`;
      const idKey = `投標廠商:投標廠商${i}:廠商代碼`;
      const addressKey = `投標廠商:投標廠商${i}:廠商地址`;
      const phoneKey = `投標廠商:投標廠商${i}:廠商電話`;
      const periodKey = `投標廠商:投標廠商${i}:履約起迄日期`;
      const isWinnerKey = `投標廠商:投標廠商${i}:是否得標`;
      
      if (detail[nameKey] && detail[isWinnerKey] === '是') {
        companies.names.push(detail[nameKey]);
        companies.ids.push(detail[idKey] || '');
        companies.addresses.push(detail[addressKey] || '');
        companies.phones.push(detail[phoneKey] || '');
        companies.periods.push(detail[periodKey] || '');
      }
    }
  }
  
  // console.log('🔍 Award Layout - Winning Companies:', companies);
  
  // Get winning vendor name for display
  const winningVendor = companies.names?.[0] || 
                        record?.enrichedData?.awardData?.winner || 
                        "未提供";
  
  // Get winning amount
  let winningAmount = null;
  
  // Try to get from winning vendor
  if (winningIndices.length > 0) {
    const index = winningIndices[0] + 1; // Convert back to 1-based index
    winningAmount = detail[`投標廠商:投標廠商${index}:決標金額`];
  }
  
  // Fallbacks
  if (!winningAmount) {
    winningAmount = detail['決標資料:總決標金額'] || 
                    record?.enrichedData?.awardData?.winningBid || 
                    "金額未公開";
  }

  return (
    <div className="col-span-8 space-y-4">
      {/* 決標資料 - Featured Section */}
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <div className="col-span-2">
            <div className="text-2xl font-bold">
              {winningAmount}
            </div>
            <div className="text-sm text-muted-foreground">決標金額</div>
          </div>
          <div>
            <div className="font-bold">
              {winningVendor}
            </div>
            <div className="text-sm text-muted-foreground">得標廠商</div>
          </div>
          <div>
            <div className="font-bold">
              {detail["決標資料:決標日期"] || 
               record?.enrichedData?.awardData?.awardDate || 
               "未提供"}
            </div>
            <div className="text-sm text-muted-foreground">決標日期</div>
          </div>
        </div>
      </div>

      {/* 得標廠商資訊 - Only show winning vendors */}
      {companies.names && companies.names.length > 0 ? (
        <div>
          <h3 className="text-lg font-semibold mb-2">得標廠商資訊</h3>
          <div className="space-y-4">
            {companies.names.map((name: string, index: number) => (
              <div key={index} className="bg-muted/50 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start border-b pb-2">
                    <span className="text-muted-foreground w-[100px] flex-shrink-0">廠商名稱</span>
                    <span className="flex-1 text-right break-all">{name ?? "-"}</span>
                  </div>
                  <div className="flex items-start border-b pb-2">
                    <span className="text-muted-foreground w-[100px] flex-shrink-0">廠商地址</span>
                    <span className="flex-1 text-right break-all">{companies.addresses?.[index] ?? "-"}</span>
                  </div>
                  <div className="flex items-start border-b pb-2">
                    <span className="text-muted-foreground w-[100px] flex-shrink-0">廠商電話</span>
                    <span className="flex-1 text-right break-all">{companies.phones?.[index] ?? "-"}</span>
                  </div>
                  <div className="flex items-start border-b pb-2">
                    <span className="text-muted-foreground w-[100px] flex-shrink-0">履約期限</span>
                    <span className="flex-1 text-right break-all">{companies.periods?.[index] ?? "-"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground text-center py-4">
          無廠商資訊
        </div>
      )}

      {/* 評選委員 */}
      {detail["最有利標:評選委員"]?.[0]?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">評選委員</h3>
          <div className="grid grid-cols-2 gap-3">
            {detail["最有利標:評選委員"][0].map((member: any, index: number) => {
              const expStr = member.與採購案相關之學經歷;
              const orgMatch = expStr?.match(/服務機關\(構\)名稱：([^職]+)職稱：([^所]+)/);
              const org = orgMatch?.[1]?.trim() || '';
              const role = orgMatch?.[2]?.trim() || '';

              return (
                <div key={index} className="bg-muted/50 rounded-lg p-3">
                  <div className="font-medium">{member.姓名} ({member.職業})</div>
                  <div className="text-sm text-muted-foreground">
                    {org && role ? `${org} - ${role}` : member.職業}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  )
} 