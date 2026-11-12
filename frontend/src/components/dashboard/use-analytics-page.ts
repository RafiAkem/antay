import { useCallback, useEffect, useState } from 'react'
import { ApiError, fetchOverview, fetchStaffEvents, fetchSummary } from '@/lib/api'
import type { AnalyticsSummary, EventDetail, OverviewEvent } from '@/types/api'

function messageOf(cause: unknown): string {
  return cause instanceof ApiError
    ? cause.message
    : 'Tidak bisa memuat data. Periksa koneksi lalu coba lagi.'
}

export function useAnalyticsPage() {
  const [events, setEvents] = useState<EventDetail[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [eventId, setEventId] = useState('')

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const [overview, setOverview] = useState<OverviewEvent[]>([])
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState<string | null>(null)

  const [eventsAttempt, setEventsAttempt] = useState(0)
  const [summaryAttempt, setSummaryAttempt] = useState(0)
  const [overviewAttempt, setOverviewAttempt] = useState(0)

  const loadEvents = useCallback(async () => {
    setEventsLoading(true)
    setEventsError(null)
    try {
      const list = await fetchStaffEvents()
      setEvents(list)
      setEventId((current) => (list.some((event) => event.id === current) ? current : (list[0]?.id ?? '')))
    } catch (cause) {
      setEvents([])
      setEventsError(messageOf(cause))
    } finally {
      setEventsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents, eventsAttempt])

  useEffect(() => {
    if (!eventId) {
      setSummary(null)
      setSummaryError(null)
      return
    }
    let alive = true
    setSummary(null)
    setSummaryLoading(true)
    setSummaryError(null)
    fetchSummary(eventId)
      .then((data) => {
        if (alive) setSummary(data)
      })
      .catch((cause) => {
        if (alive) setSummaryError(messageOf(cause))
      })
      .finally(() => {
        if (alive) setSummaryLoading(false)
      })
    return () => {
      alive = false
    }
  }, [eventId, summaryAttempt])

  useEffect(() => {
    let alive = true
    setOverviewLoading(true)
    setOverviewError(null)
    fetchOverview()
      .then((data) => {
        if (alive) setOverview(data)
      })
      .catch((cause) => {
        if (alive) setOverviewError(messageOf(cause))
      })
      .finally(() => {
        if (alive) setOverviewLoading(false)
      })
    return () => {
      alive = false
    }
  }, [overviewAttempt])

  return {
    events,
    eventsLoading,
    eventsError,
    eventId,
    selectEvent: setEventId,
    retryEvents: () => setEventsAttempt((value) => value + 1),
    summary,
    summaryLoading,
    summaryError,
    retrySummary: () => setSummaryAttempt((value) => value + 1),
    overview,
    overviewLoading,
    overviewError,
    retryOverview: () => setOverviewAttempt((value) => value + 1),
  }
}
