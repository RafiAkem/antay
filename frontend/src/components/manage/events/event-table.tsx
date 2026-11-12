import { Link } from 'react-router-dom'
import { formatRupiah } from '@/components/ui/format-rupiah'
import { Skeleton } from '@/components/ui/skeleton'
import type { ListedEvent } from '../shared/listed-event'
import { formatEventDate, priceFrom } from '../shared/manage-labels'
import { PosterArt } from '../shared/poster-art'
import { StatusPill } from '../shared/status-pill'

const HEAD = 'px-3 py-2.5 text-left text-xs font-semibold text-muted'
const CELL = 'px-3 py-2.5 align-middle'

// Tabel hanya untuk layar lebar. Di bawah lg daftarnya jadi kartu (EventGrid).
export function EventTable({ events, showOrganizer }: { events: ListedEvent[]; showOrganizer: boolean }) {
  return (
    <div className="hidden overflow-x-auto rounded-card border border-border-soft bg-surface lg:block">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead className="border-b border-border-soft bg-ground">
          <tr>
            <th scope="col" className={HEAD}>Event</th>
            <th scope="col" className={HEAD}>Tanggal</th>
            <th scope="col" className={HEAD}>Status</th>
            <th scope="col" className={`${HEAD} text-right`}>Kategori</th>
            <th scope="col" className={`${HEAD} text-right`}>Mulai dari</th>
            <th scope="col" className={HEAD}>
              <span className="sr-only">Aksi</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => {
            const lowest = priceFrom(event)
            return (
              <tr key={event.id} className="border-b border-rule last:border-b-0 hover:bg-ground">
                <td className={CELL}>
                  <div className="flex items-center gap-3">
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
                        className="truncate font-semibold text-ink hover:text-accent-ink hover:underline"
                      >
                        {event.name}
                      </Link>
                      <span className="truncate text-xs text-muted">
                        <span className="font-mono">{event.codePrefix}</span> · {event.place}
                        {showOrganizer && event.organizerName ? ` · ${event.organizerName}` : ''}
                      </span>
                    </div>
                  </div>
                </td>
                <td className={`${CELL} whitespace-nowrap text-muted`}>{formatEventDate(event.eventDate)}</td>
                <td className={CELL}>
                  <StatusPill status={event.status} />
                </td>
                <td className={`${CELL} text-right font-mono`}>
                  {event.categories ? event.categories.length : <Skeleton className="ml-auto h-3 w-6" />}
                </td>
                <td className={`${CELL} text-right font-mono whitespace-nowrap`}>
                  {!event.categories ? (
                    <Skeleton className="ml-auto h-3 w-20" />
                  ) : lowest === null ? (
                    <span className="font-sans text-muted">Belum ada</span>
                  ) : (
                    formatRupiah(lowest)
                  )}
                </td>
                <td className={`${CELL} text-right`}>
                  <Link
                    to={`/manage/events/${event.id}`}
                    className="text-[13px] font-semibold text-accent hover:underline"
                    aria-label={`Ubah ${event.name}`}
                  >
                    Ubah
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
