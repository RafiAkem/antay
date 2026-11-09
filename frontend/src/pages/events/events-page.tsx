import { useCallback, useEffect, useState } from 'react'
import { ApiError, fetchOpenEvents } from '@/lib/api'
import type { EventDetail } from '@/types/api'
import { EventCard } from '@/components/events/event-card'
import { EventsEmpty, EventsError, EventsLoading } from '@/components/events/event-states'
import { todayLabel } from '@/lib/format'

type LoadState = 'loading' | 'ready' | 'error'

export function EventsPage() {
  const [events, setEvents] = useState<EventDetail[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      setEvents(await fetchOpenEvents())
      setState('ready')
    } catch (cause) {
      setState('error')
      setError(cause instanceof ApiError ? cause.message : 'Event hari ini gagal dimuat.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="grid gap-5">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">Event hari ini</h1>
        <p className="text-sm text-muted">
          {todayLabel()}. Pilih satu event untuk melihat jam datang yang masih kosong.
        </p>
      </header>

      {state === 'loading' ? (
        <EventsLoading />
      ) : state === 'error' ? (
        <EventsError message={error} onRetry={() => void load()} />
      ) : events.length === 0 ? (
        <EventsEmpty />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  )
}
