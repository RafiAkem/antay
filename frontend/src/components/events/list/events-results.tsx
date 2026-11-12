import { Button } from '@/components/ui/button'
import type { CatalogEvent } from '@/types/catalog'
import { EventCard } from '../event-card'
import { EVENT_GRID, EventsEmpty, EventsError, EventsLoading } from '../event-states'
import { WHEN_OPTIONS, type WhenFilter } from './event-dates'
import type { CatalogLoadState } from './use-catalog-events'

type EventsResultsProps = {
  state: CatalogLoadState
  error: string | null
  total: number
  results: CatalogEvent[]
  query: string
  when: WhenFilter
  onRetry: () => void
  onReset: () => void
}

export function EventsResults({ state, error, total, results, query, when, onRetry, onReset }: EventsResultsProps) {
  if (state === 'loading') return <EventsLoading />
  if (state === 'error') return <EventsError message={error} onRetry={onRetry} />
  if (total === 0) return <EventsEmpty />

  if (results.length === 0) {
    return (
      <EventsEmpty
        title={emptyTitle(query, when)}
        hint={`Ada ${total} event lain yang sedang tayang. Hapus saringan untuk melihat semuanya.`}
        action={
          <Button variant="ghost" size="small" onClick={onReset}>
            Hapus saringan
          </Button>
        }
      />
    )
  }

  return (
    <ul className={EVENT_GRID}>
      {results.map((event) => (
        <li key={event.id} className="min-w-0">
          <EventCard event={event} />
        </li>
      ))}
    </ul>
  )
}

function emptyTitle(query: string, when: WhenFilter): string {
  const period = when === 'all' ? '' : ` ${WHEN_OPTIONS.find((option) => option.value === when)?.label.toLowerCase()}`
  const trimmed = query.trim()
  if (trimmed) return `Tidak ada event "${trimmed}"${period}.`
  return `Tidak ada event${period}.`
}
