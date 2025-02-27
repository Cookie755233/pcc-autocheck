import { TenderLayoutProps } from './tender-layout'

export function BiddingLayout({ record }: TenderLayoutProps) {
  const detail = record?.detail || {}

  return (
    <div className="col-span-8 space-y-4">
      {/* 採購資料 - Featured Section */}
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <div className="col-span-2">
            <div className="text-2xl font-bold">
              {detail["採購資料:預計金額是否公開"]?.includes("否")
                ? "預算金額不公開" 
                : detail["採購資料:預算金額"] || "未提供"}
            </div>
            <div className="text-sm text-muted-foreground">預算金額</div>
          </div>
          <div>
            <div className="font-bold">
              {detail["領投開標:截止投標"] || "未提供"}
            </div>
            <div className="text-sm font-bold">截止投標時間</div>
          </div>
          <div>
            <div className="font-bold">
              {detail["領投開標:開標時間"] || "未提供"}
            </div>
            <div className="text-sm font-bold">開標時間</div>
          </div>
        </div>
      </div>

      {/* 招標資料 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">招標資料</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">招標方式</span>
            <span>{detail["招標資料:招標方式"] || "未提供"}</span>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">決標方式</span>
            <span>{detail["招標資料:決標方式"] || "未提供"}</span>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">招標狀態</span>
            <span>{detail["招標資料:招標狀態"] || "未提供"}</span>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">價格是否納入評選</span>
            <span>{detail["招標資料:價格是否納入評選"] || "未提供"}</span>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">公告日</span>
            <span>{detail["招標資料:公告日"] || "未提供"}</span>
          </div>
        </div>
      </div>

      {/* 投標地點 */}
      <div className="bg-muted/80 rounded-lg p-3">
        <h3 className="font-semibold mb-2">投標地點</h3>
        <div className="text-sm">
          {detail["領投開標:收受投標文件地點"] || "未提供"}
        </div>
      </div>
    </div>
  )
} 