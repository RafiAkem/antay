import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/pill'
import { Skeleton } from '@/components/ui/skeleton'
import { Notice } from './notice'

// Bentuknya meniru bar event, kartu cek tiket, dan panel antrean supaya
// halaman tidak melompat saat data datang.
export function CounterSkeleton() {
  return (
    <div className="grid gap-4" role="status" aria-label="Memuat loket">
      <Skeleton className="h-[88px] rounded-card" />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <Skeleton className="h-[148px] rounded-card" />
          <Skeleton className="h-[260px] rounded-card" />
        </div>
        <Skeleton className="h-[280px] rounded-card" />
      </div>
    </div>
  )
}

export function CounterEventsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid gap-3 sm:flex sm:items-center">
      <div className="min-w-0 flex-1">
        <Notice tone="bad" title="Event gagal dimuat">
          {message}
        </Notice>
      </div>
      <Button variant="ghost" onClick={onRetry}>
        Muat ulang
      </Button>
    </div>
  )
}

export function CounterNoEvents() {
  return (
    <Empty
      title="Belum ada event yang dibuka hari ini"
      hint="Event muncul di sini setelah disetujui admin mal dan jam penukarannya tiba. Hubungi admin kalau jadwalmu sudah mulai."
    />
  )
}
