import { Link } from 'react-router-dom'
import { Empty } from '@/components/ui/pill'
import { Skeleton } from '@/components/ui/skeleton'

export function EventListSkeleton() {
  return (
    <div role="status" aria-label="Memuat daftar event">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:hidden">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="grid gap-2">
            <Skeleton className="aspect-square w-full rounded-card" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-card border border-border-soft bg-surface lg:grid">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex items-center gap-3 border-b border-rule px-3 py-2.5 last:border-b-0">
            <Skeleton className="h-12 w-12" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="ml-auto h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-pill" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Dua kasus kosong yang berbeda: belum pernah membuat event, atau saringannya terlalu sempit.
export function EventListEmpty({ hasEvents, onReset }: { hasEvents: boolean; onReset: () => void }) {
  if (!hasEvents) {
    return (
      <Empty
        title="Belum ada event"
        hint="Mulai dari draf: isi info event, tambah kategori dan paket, lalu ajukan ke admin mal untuk tayang."
        action={
          <Link to="/manage/events/new" className="mt-1 text-sm font-semibold text-accent hover:underline">
            Buat event pertama
          </Link>
        }
      />
    )
  }
  return (
    <Empty
      title="Tidak ada event yang cocok"
      hint="Coba kata kunci lain atau lihat semua status."
      action={
        <button
          type="button"
          onClick={onReset}
          className="mt-1 justify-self-start text-sm font-semibold text-accent hover:underline"
        >
          Tampilkan semua event
        </button>
      }
    />
  )
}
