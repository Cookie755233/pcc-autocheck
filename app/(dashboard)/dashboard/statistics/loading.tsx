import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function StatisticsLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-10 w-[200px]" />
      
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
        <Card className="p-4">
          <Skeleton className="h-[300px] w-full" />
        </Card>

        <Card className="p-4">
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-[150px]" />
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, j) => (
                    <Skeleton key={j} className="h-20 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
} 