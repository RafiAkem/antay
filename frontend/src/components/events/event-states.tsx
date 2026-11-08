import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty } from '@/components/ui/pill'

export function EventsLoading() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" role="status" aria-live="polite">
      <div className="h-48 animate-pulse rounded-[var(--radius-card)] bg-raised" />
      <div className="h-48 animate-pulse rounded-[var(--radius-card)] bg-raised" />
      <span className="sr-only">Memuat event hari ini...</span>
    </div>
  )
}

export function EventsError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <Card>
      <div className="grid justify-items-start gap-3">
        <b className="font-semibold">Event hari ini gagal dimuat.</b>
        <p className="text-sm text-muted">{message}</p>
        <Button onClick={onRetry}>Coba lagi</Button>
      </div>
    </Card>
  )
}

export function EventsEmpty() {
  return (
    <Empty
      title="Belum ada event hari ini."
      hint="Event yang dibuka penyelenggara akan muncul di sini, lengkap dengan jam datang yang bisa dipesan."
    />
  )
}
