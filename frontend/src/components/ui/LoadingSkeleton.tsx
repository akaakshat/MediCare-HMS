interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 8, className = '' }: TableSkeletonProps) {
  return (
    <div className={`space-y-4 animate-pulse ${className}`.trim()}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-10 w-full max-w-xl rounded-lg bg-gray-200 dark:bg-slate-700" />
        <div className="h-10 w-28 rounded-lg bg-gray-200 dark:bg-slate-700" />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="grid gap-4 border-b border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800 md:grid-cols-8">
          {Array.from({ length: columns }).map((_, index) => (
            <div key={`head-${index}`} className="h-3 rounded-full bg-gray-200 dark:bg-slate-700" />
          ))}
        </div>

        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid gap-4 border-b border-gray-100 p-4 last:border-b-0 dark:border-slate-800 md:grid-cols-8">
            {Array.from({ length: columns }).map((_, cellIndex) => (
              <div
                key={`cell-${rowIndex}-${cellIndex}`}
                className={`h-4 rounded-full bg-gray-200 dark:bg-slate-700 ${cellIndex === 0 ? 'w-3/4' : cellIndex === columns - 1 ? 'w-1/2' : 'w-full'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-10 w-64 rounded-lg bg-gray-200 animate-pulse dark:bg-slate-800" />

        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 h-3 w-24 rounded-full bg-gray-200 dark:bg-slate-700" />
              <div className="mb-2 h-8 w-24 rounded-full bg-gray-200 dark:bg-slate-700" />
              <div className="h-3 w-32 rounded-full bg-gray-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="h-10 w-full max-w-xl rounded-lg bg-gray-200 dark:bg-slate-700" />
            <div className="h-10 w-28 rounded-lg bg-gray-200 dark:bg-slate-700" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 rounded-lg bg-gray-100 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
