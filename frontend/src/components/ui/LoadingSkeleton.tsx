interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/6 ${className}`}
      aria-hidden="true"
    />
  )
}

/** Generic block used while a page's primary content loads. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="sb-glass space-y-3 rounded-2xl p-5">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={index % 2 ? 'h-3 w-4/5' : 'h-3 w-full'} />
      ))}
    </div>
  )
}

/** Grid of cards - for opportunity and assessment listings. */
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="sb-glass space-y-3 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-2 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Stat row used at the top of the dashboard and progress pages. */
export function SkeletonMetrics({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="sb-glass space-y-3 rounded-2xl p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-2.5 w-28" />
        </div>
      ))}
    </div>
  )
}
