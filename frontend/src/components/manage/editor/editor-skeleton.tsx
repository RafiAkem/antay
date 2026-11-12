import { Skeleton } from '@/components/ui/skeleton'

export function EditorSkeleton() {
  return (
    <div className="grid gap-5" role="status" aria-label="Memuat event">
      <Skeleton className="h-4 w-24" />
      <div className="grid gap-2">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>
      <div className="flex gap-3 border-b border-border-soft pb-2">
        {[0, 1, 2, 3, 4].map((tab) => (
          <Skeleton key={tab} className="h-5 w-16" />
        ))}
      </div>
      <Skeleton className="h-[320px] w-full rounded-card" />
    </div>
  )
}
