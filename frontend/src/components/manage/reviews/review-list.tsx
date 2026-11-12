import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/components/ui/format-rupiah'
import type { ListedEvent } from '../shared/listed-event'
import { formatEventDate, priceFrom } from '../shared/manage-labels'
import { PosterArt } from '../shared/poster-art'
import { RejectModal } from '../shared/reject-modal'
import type { useEventTransition } from '../shared/use-event-transition'

type ReviewListProps = {
  events: ListedEvent[]
  transition: ReturnType<typeof useEventTransition>
}

const SUBMITTED = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function submittedLabel(value: string | null): string {
  if (!value) return 'Waktu pengajuan tidak tercatat'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Waktu pengajuan tidak tercatat' : `Diajukan ${SUBMITTED.format(date)} WIB`
}

function summary(event: ListedEvent): string {
  if (!event.categories) return 'Memuat kategori...'
  const categories = event.categories
  const packages = categories.reduce((total, category) => total + (category.packages?.length ?? 0), 0)
  const lowest = priceFrom(event)
  const price = lowest === null ? 'belum ada harga' : `mulai ${formatRupiah(lowest)}`
  return `${categories.length} kategori · ${packages} paket · ${price}`
}

export function ReviewList({ events, transition }: ReviewListProps) {
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<ListedEvent | null>(null)

  async function act(event: ListedEvent, kind: 'approvals' | 'rejections', reason?: string) {
    setActingId(event.id)
    const ok = await transition.run(event, kind, reason)
    setActingId(null)
    if (ok) setRejecting(null)
  }

  return (
    <>
      <ul className="grid overflow-hidden rounded-card border border-border-soft bg-surface">
        {events.map((event) => {
          const busy = actingId === event.id
          return (
            <li
              key={event.id}
              className="flex flex-col gap-3 border-b border-rule p-4 last:border-b-0 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <PosterArt
                  size="thumb"
                  name={event.name}
                  eventDate={event.eventDate}
                  posterUrl={event.posterUrl}
                  codePrefix={event.codePrefix}
                />
                <div className="grid min-w-0 gap-0.5">
                  <Link
                    to={`/manage/events/${event.id}`}
                    className="font-semibold break-words text-ink hover:text-accent-ink hover:underline"
                  >
                    {event.name}
                  </Link>
                  <span className="text-[13px] text-muted">
                    {formatEventDate(event.eventDate)} · {event.place}
                    {event.organizerName ? ` · ${event.organizerName}` : ''}
                  </span>
                  <span className="text-xs text-muted">{summary(event)}</span>
                  <span className="text-xs text-muted">{submittedLabel(event.submittedAt)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-none">
                <Link
                  to={`/manage/events/${event.id}`}
                  className="inline-flex h-8 items-center rounded-control px-3 text-[13px] font-semibold text-accent hover:bg-raised"
                >
                  Periksa
                </Link>
                <Button variant="ghost" size="small" disabled={actingId !== null} onClick={() => setRejecting(event)}>
                  Tolak
                </Button>
                <Button size="small" disabled={actingId !== null} onClick={() => void act(event, 'approvals')}>
                  {busy && transition.busy === 'approvals' ? 'Menyetujui...' : 'Setujui'}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      <RejectModal
        open={rejecting !== null}
        eventName={rejecting?.name ?? ''}
        busy={rejecting !== null && actingId === rejecting.id}
        onClose={() => setRejecting(null)}
        onConfirm={(reason) => {
          if (rejecting) void act(rejecting, 'rejections', reason)
        }}
      />
    </>
  )
}
