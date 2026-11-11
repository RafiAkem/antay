import { Button } from '@/components/ui/button'
import { Card, CardHead } from '@/components/ui/card'
import { Empty, Pill } from '@/components/ui/pill'
import { Skeleton } from '@/components/ui/skeleton'
import type { OverviewEvent } from '@/types/api'

type Props = {
  events: OverviewEvent[]
  loading: boolean
  error: string | null
  onRetry: () => void
}

export function EventOverview({ events, loading, error, onRetry }: Props) {
  return (
    <Card>
      <CardHead title="Event hari ini" meta={loading ? 'memuat' : `${events.length} event`} />
      {error ? (
        <div role="alert" className="grid justify-items-start gap-3 rounded-control border-l-4 border-negative bg-negative-bg p-4 text-sm text-negative-ink">
          <span>{error}</span>
          <Button variant="ghost" size="small" onClick={onRetry}>
            Coba lagi
          </Button>
        </div>
      ) : loading ? (
        <div className="grid gap-3" role="status" aria-label="Memuat event hari ini">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-12" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <Empty
          title="Belum ada event hari ini"
          hint="Event yang sudah disetujui dan berjalan hari ini akan muncul di sini."
        />
      ) : (
        <ul className="grid">
          {events.map((event) => (
            <li
              key={event.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-t border-border-soft py-3 first:border-t-0 first:pt-0"
            >
              <b className="truncate text-sm font-semibold">{event.name}</b>
              <span className="num text-right text-sm font-semibold" aria-label={`${event.registered} terdaftar, ${event.redeemed} ditukar`}>
                {event.registered} / {event.redeemed}
              </span>
              <span className="truncate text-[13px] text-muted">
                {event.place} · {event.openTime}-{event.closeTime}
              </span>
              <span className="justify-self-end">
                {event.queue.long ? (
                  <Pill tone="warn">tunggu {event.queue.waitMinutes} mnt</Pill>
                ) : (
                  <span className="num text-xs text-muted">tunggu {event.queue.waitMinutes} mnt</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
