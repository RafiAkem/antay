import { Link } from 'react-router-dom'
import { formatRupiah } from '@/components/ui/format-rupiah'
import { Skeleton } from '@/components/ui/skeleton'
import type { ListedEvent } from '../shared/listed-event'
import { formatEventDate, priceFrom } from '../shared/manage-labels'
import { PosterArt } from '../shared/poster-art'
import { StatusPill } from '../shared/status-pill'

// Versi ponsel dan tablet: kartu dua kolom, poster di atas, seluruh kartu bisa diketuk.
export function EventGrid({ events }: { events: ListedEvent[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:hidden">
      {events.map((event) => {
        const lowest = priceFrom(event)
        return (
          <li key={event.id} className="min-w-0">
            <Link to={`/manage/events/${event.id}`} className="group grid gap-2">
              <PosterArt size="card" name={event.name} eventDate={event.eventDate} posterUrl={event.posterUrl} />
              <div className="grid justify-items-start gap-1">
                <StatusPill status={event.status} />
                <span className="line-clamp-2 text-sm leading-5 font-semibold group-hover:text-accent-ink">
                  {event.name}
                </span>
                <span className="text-xs text-muted">{formatEventDate(event.eventDate)}</span>
                {event.categories ? (
                  <span className="text-xs text-muted">
                    {event.categories.length} kategori
                    {lowest === null ? '' : ` · Mulai ${formatRupiah(lowest)}`}
                  </span>
                ) : (
                  <Skeleton className="h-3 w-24" />
                )}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
