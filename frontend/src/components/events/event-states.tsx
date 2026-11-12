import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Paragraph } from '@/components/ui/text'

// Grid kartu dipakai bersama daftar dan skeleton-nya, supaya waktu data datang
// kartunya muncul persis di tempat kotak abu-abunya.
export const EVENT_GRID = 'grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-4 lg:gap-y-8'

export function EventCardSkeleton() {
  return (
    <div className="grid content-start gap-2.5">
      <Skeleton className="aspect-square w-full rounded-card" />
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-1 h-3 w-1/2" />
        <Skeleton className="h-3.5 w-3/5" />
      </div>
    </div>
  )
}

export function EventsLoading({ count = 8 }: { count?: number }) {
  return (
    <div role="status" aria-live="polite">
      <div className={EVENT_GRID}>
        {Array.from({ length: count }, (_, index) => (
          <EventCardSkeleton key={index} />
        ))}
      </div>
      <span className="sr-only">Memuat daftar event...</span>
    </div>
  )
}

export function EventsError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div role="alert" className="grid justify-items-start gap-3 rounded-card border border-border-soft bg-surface p-5">
      <div className="grid gap-1">
        <Heading level={2} size="md">
          Daftar event belum bisa dimuat.
        </Heading>
        <Paragraph tone="muted" size="sm">
          {message ?? 'Server tidak menjawab. Tunggu sebentar lalu coba lagi.'}
        </Paragraph>
      </div>
      <Button variant="ghost" size="small" onClick={onRetry}>
        Coba lagi
      </Button>
    </div>
  )
}

type EventsEmptyProps = {
  title?: string
  hint?: string
  action?: ReactNode
}

export function EventsEmpty({
  title = 'Belum ada event yang dijual.',
  hint = 'Penyelenggara di Summarecon Mall Bandung sedang menyiapkan jadwalnya. Event baru langsung muncul di sini begitu tiketnya dibuka.',
  action,
}: EventsEmptyProps) {
  return (
    <div className="grid justify-items-start gap-3 rounded-card border border-dashed border-control px-5 py-8">
      <div className="grid max-w-[52ch] gap-1">
        <Heading level={2} size="md">
          {title}
        </Heading>
        <Paragraph tone="muted" size="sm">
          {hint}
        </Paragraph>
      </div>
      {action}
    </div>
  )
}
