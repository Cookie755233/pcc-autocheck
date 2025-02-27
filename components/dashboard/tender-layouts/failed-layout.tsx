import { TenderLayoutProps } from './tender-layout'

export function FailedBidLayout({ record }: TenderLayoutProps) {
  const detail = record?.detail || {}

  return (
    <div className="col-span-8 space-y-4">
      {/* 無法決標資料 - Featured Section */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-2">
            <div className="text-2xl font-bold text-red-600">
              {detail["無法決標公告:無法決標的理由"] ?? "未提供"}
            </div>
            <div className="text-sm text-muted-foreground">無法決標原因</div>
          </div>
          <div>
            <div className="font-bold">
              {detail["無法決標公告:原招標公告之刊登採購公報日期"] ?? "未提供"}
            </div>
            <div className="text-sm text-muted-foreground">原招標公告日期</div>
          </div>
          <div>
            <div className="font-bold">
              {detail["無法決標公告:無法決標公告日期"] ?? "未提供"}
            </div>
            <div className="text-sm text-muted-foreground">無法決標公告日期</div>
          </div>
        </div>
      </div>

      {/* 招標資料 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">招標資料</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">標的分類</span>
            <span>{detail["無法決標公告:標的分類"] ?? "未提供"}</span>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">招標方式</span>
            <span>{detail["無法決標公告:招標方式"] ?? "未提供"}</span>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">是否複數決標</span>
            <span>{detail["無法決標公告:是否複數決標"] ?? "未提供"}</span>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">是否續行招標</span>
            <span>{detail["無法決標公告:是否沿用本案號及原招標方式續行招標"] ?? "未提供"}</span>
          </div>
        </div>
      </div>
    </div>
  );
} 