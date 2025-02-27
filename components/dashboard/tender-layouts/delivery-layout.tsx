import { TenderLayoutProps } from './tender-layout'
import { getWinningVendors } from '@/lib/utils';

export function DeliveryLayout({ record }: TenderLayoutProps) {
  const detail = record?.detail || {}
  const vendors = getWinningVendors(record || {});

  return (
    <div className="col-span-8 space-y-4">
      {/* 決標資料 - Featured Section */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-2">
            <div className="text-2xl font-bold text-blue-600">
              {(detail["決標資料:總決標金額"] || detail["投標廠商:投標廠商1:決標金額"]) ?? "未提供"}
            </div>
            <div className="text-sm text-muted-foreground">決標金額</div>
          </div>
          <div>
            <div className="font-bold">
              {detail["決標資料:底價金額是否公開"] === "是" ? detail["決標資料:底價金額"] : "底價未公開"}
            </div>
            <div className="text-sm text-muted-foreground">底價金額</div>
          </div>
          <div>
            <div className="font-bold">
              {detail["決標資料:決標日期"] ?? "未提供"}
            </div>
            <div className="text-sm text-muted-foreground">決標日期</div>
          </div>
        </div>
      </div>

      {/* 得標廠商資訊 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">得標廠商資訊</h3>
        <div className="space-y-4">
          {vendors.map((vendor, index) => (
            <div key={index} className="bg-muted/50 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-start border-b pb-2">
                  <span className="text-muted-foreground w-[100px] flex-shrink-0">廠商名稱</span>
                  <span className="flex-1 text-right break-all">{vendor.name ?? "-"}</span>
                </div>
                <div className="flex items-start border-b pb-2">
                  <span className="text-muted-foreground w-[100px] flex-shrink-0">廠商地址</span>
                  <span className="flex-1 text-right break-all">{vendor.address ?? "-"}</span>
                </div>
                <div className="flex items-start border-b pb-2">
                  <span className="text-muted-foreground w-[100px] flex-shrink-0">廠商電話</span>
                  <span className="flex-1 text-right break-all">{vendor.phone ?? "-"}</span>
                </div>
                <div className="flex items-start border-b pb-2">
                  <span className="text-muted-foreground w-[100px] flex-shrink-0">履約期限</span>
                  <span className="flex-1 text-right break-all">{vendor.period ?? "-"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 採購資料 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">採購資料</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">招標方式</span>
            <span>{detail["採購資料:招標方式"] ?? "-"}</span>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">決標方式</span>
            <span>{detail["採購資料:決標方式"] ?? "-"}</span>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">標的分類</span>
            <span>{detail["採購資料:標的分類"] ?? "-"}</span>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">履約地點</span>
            <span>{detail["採購資料:履約地點"] ?? "-"}</span>
          </div>
        </div>
      </div>
    </div>
  )
} 