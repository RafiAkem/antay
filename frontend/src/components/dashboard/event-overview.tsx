import { Button } from '@/components/ui/button'
import { Card, CardHead } from '@/components/ui/card'
import { Empty, Pill } from '@/components/ui/pill'
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
        <div className="grid justify-items-start gap-3 rounded-[var(--radius-card)] border border-dashed border-negative bg-negative-bg p-4 text-sm text-negative-ink">
          <span>{error}</span>
          <Button variant="ghost" size="small" onClick={onRetry}>
            Coba lagi
          </Button>
        </div>
      ) : loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-12 animate-pulse rounded bg-raised" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <Empty
          title="Belum ada event hari ini"
          hint="Event yang dibuat hari ini akan muncul di sini."
        />
      ) : (
        <div className="grid">
          {events.map((event) => (
            <div
              key={event.id}
              className="grid gap-x-4 gap-y-0.5 border-t border-rule py-3 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <b className="truncate text-sm font-semibold">{event.name}</b>
              <span className="num text-right text-sm">
                {event.registered} / {event.redeemed}
                <span className="mt-1 block">
                  {event.queue.long ? (
                    <Pill tone="warn">tunggu {event.queue.waitMinutes} mnt</Pill>
                  ) : (
                    <span className="text-xs text-muted">tunggu {event.queue.waitMinutes} mnt</span>
                  )}
                </span>
              </span>
              <span className="text-[13px] text-muted">
                {event.place} · {event.openTime}-{event.closeTime}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
