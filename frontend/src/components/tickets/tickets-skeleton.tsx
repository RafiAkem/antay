import { Skeleton } from '@/components/ui/skeleton'

// Bentuknya meniru judul bagian plus kotak kosong tiket yang dibeli.
export function TicketsSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <span className="sr-only" role="status">
        Memuat tiket...
      </span>
      <Skeleton className="h-6 w-44" />
      <Skeleton className="h-[132px] rounded-card" />
    </div>
  )
}
