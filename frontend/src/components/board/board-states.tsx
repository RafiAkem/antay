import { LinkButton } from '@/components/admin/shared/link-button'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/pill'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Paragraph } from '@/components/ui/text'

// Skeleton papan memakai warna malam juga, supaya layar TV tidak menyala
// putih sesaat setiap kali halaman dimuat ulang.
export function BoardSkeleton() {
  return (
    <div className="grid aspect-[16/10] max-h-[80dvh] min-h-[360px] content-start gap-8 rounded-card bg-board p-[clamp(20px,4vw,64px)]" role="status">
      <span className="sr-only">Memuat papan antrean...</span>
      <div className="h-[clamp(28px,3.6vw,60px)] w-2/3 animate-pulse rounded-control bg-board-line motion-reduce:animate-none" />
      <div className="grid grid-cols-3 gap-6">
        {[0, 1, 2].map((cell) => (
          <div key={cell} className="h-[clamp(80px,9vw,180px)] animate-pulse rounded-control bg-board-line motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  )
}

export function BoardSelectSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <Skeleton className="h-10 w-64 max-w-full" />
      <span className="sr-only">Memuat event...</span>
    </div>
  )
}

function RetryBlock({ title, message, onRetry }: { title: string; message?: string | null; onRetry: () => void }) {
  return (
    <div role="alert" className="grid justify-items-start gap-3 rounded-card border border-border-soft bg-surface p-5">
      <div className="grid gap-1">
        <Heading level={2} size="md">
          {title}
        </Heading>
        {message ? <Paragraph tone="muted">{message}</Paragraph> : null}
      </div>
      <Button onClick={onRetry}>Coba lagi</Button>
    </div>
  )
}

export function BoardEventsError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return <RetryBlock title="Daftar event gagal dimuat." message={message} onRetry={onRetry} />
}

export function BoardError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return <RetryBlock title="Papan antrean belum bisa dimuat." message={message} onRetry={onRetry} />
}

export function BoardNoEvents() {
  return (
    <Empty
      title="Belum ada event hari ini."
      hint="Papan antrean menyala setelah event disetujui admin mal dan dibuka untuk pengunjung."
      action={
        <LinkButton to="/events" variant="ghost" size="small" className="w-fit">
          Lihat halaman pengunjung
        </LinkButton>
      }
    />
  )
}

export function BoardNotFound() {
  return (
    <Empty
      title="Event tidak tersedia."
      hint="Event ini sudah ditutup atau tidak ditemukan. Pilih event lain atau kembali ke halaman pengunjung."
      action={
        <LinkButton to="/events" variant="ghost" size="small" className="w-fit">
          Lihat event hari ini
        </LinkButton>
      }
    />
  )
}

export function BoardStale({ at }: { at: string }) {
  return (
    <p role="status" className="rounded-control border-l-4 border-scarce bg-warning-bg px-4 py-2.5 text-[13px] text-warning-ink">
      Data terakhir pukul {at}. Server belum bisa dihubungi, mencoba lagi...
    </p>
  )
}
