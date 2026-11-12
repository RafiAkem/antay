import { Skeleton } from '@/components/ui/skeleton'

// Bentuknya meniru editor asli: bar mode, kanvas, panel kanan, ringkasan.
export function SeatEditorSkeleton() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Memuat denah">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-pill" />
        <Skeleton className="h-9 w-24 rounded-pill" />
        <Skeleton className="ml-auto h-8 w-28" />
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Skeleton className="h-[clamp(320px,60dvh,780px)] rounded-card" />
        <div className="hidden gap-3 rounded-card border border-border-soft p-4 lg:grid lg:content-start">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </div>
      <Skeleton className="h-16 rounded-card" />
    </div>
  )
}
