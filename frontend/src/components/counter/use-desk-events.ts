import { useCallback, useEffect, useState } from 'react'
import { ApiError, fetchStaffEvents } from '@/lib/api'
import type { EventDetail } from '@/types/api'

// Daftar event loket dan event yang sedang dilayani. Dipisah dari
// use-ticket-desk supaya hook utama tinggal mengurus cek dan tukar tiket.
export function useDeskEvents() {
  const [events, setEvents] = useState<EventDetail[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [eventId, setEventId] = useState('')

  const event = events.find((item) => item.id === eventId) ?? null

  const applyEvent = useCallback((updated: EventDetail) => {
    setEvents((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
  }, [])

  const loadEvents = useCallback(() => {
    setEventsLoading(true)
    setEventsError(null)
    fetchStaffEvents()
      .then((list) => {
        setEvents(list)
        setEventId((prev) => (prev && list.some((item) => item.id === prev) ? prev : (list[0]?.id ?? '')))
      })
      .catch((cause) => {
        setEventsError(cause instanceof ApiError ? cause.message : 'Gagal memuat daftar event.')
      })
      .finally(() => setEventsLoading(false))
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  return { events, eventsLoading, eventsError, eventId, setEventId, event, applyEvent, loadEvents }
}
