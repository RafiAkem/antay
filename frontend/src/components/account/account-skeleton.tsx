import { Skeleton } from '@/components/ui/skeleton'

// Meniru kartu profil plus baris Tiket saya, supaya halaman tidak meloncat
// saat sesi selesai dicek.
export function AccountSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <span className="sr-only" role="status">
        Memuat akun...
      </span>
      <div className="rounded-card border border-border-soft bg-surface p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-pill" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
        </div>
        <div className="mt-5 grid gap-4 border-t border-border-soft pt-5 sm:grid-cols-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </div>
      <Skeleton className="h-[74px] rounded-card" />
    </div>
  )
}
