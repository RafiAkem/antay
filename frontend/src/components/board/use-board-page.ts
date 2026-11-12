import { useCallback, useEffect, useState } from 'react'
import { ApiError, fetchBoard, fetchOpenEvents } from '@/lib/api'
import type { BoardData, EventDetail } from '@/types/api'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

const REFRESH_MS = 10_000

export function useBoardPage() {
  const [events, setEvents] = useState<EventDetail[]>([])
  const [eventsState, setEventsState] = useState<LoadState>('loading')
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const [board, setBoard] = useState<BoardData | null>(null)
  const [boardState, setBoardState] = useState<LoadState>('idle')
  const [boardError, setBoardError] = useState<{ message: string; notFound: boolean } | null>(null)

  const loadEvents = useCallback(async () => {
    setEventsState('loading')
    setEventsError(null)
    try {
      const list = await fetchOpenEvents()
      setEvents(list)
      setEventId((prev) => (prev && list.some((item) => item.id === prev) ? prev : (list[0]?.id ?? null)))
      setEventsState('ready')
    } catch (cause) {
      setEventsState('error')
      setEventsError(cause instanceof ApiError ? cause.message : 'Daftar event gagal dimuat.')
    }
  }, [])

  // quiet dipakai saat refresh berkala: papan tetap menampilkan angka lama
  // selama permintaan berikutnya berjalan, bukan berkedip jadi skeleton.
  const loadBoard = useCallback(async (id: string, quiet = false) => {
    if (!quiet) setBoardState('loading')
    try {
      const data = await fetchBoard(id)
      setBoard(data)
      setBoardState('ready')
      setBoardError(null)
    } catch (cause) {
      const notFound = cause instanceof ApiError && cause.status === 404
      setBoardState('error')
      setBoardError({
        message: cause instanceof ApiError ? cause.message : 'Data papan gagal dimuat.',
        notFound,
      })
      if (notFound) setBoard(null)
    }
  }, [])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  useEffect(() => {
    if (!eventId) return
    void loadBoard(eventId)
    const timer = window.setInterval(() => void loadBoard(eventId, true), REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [eventId, loadBoard])

  function changeEvent(id: string) {
    setEventId(id)
    setBoard(null)
    setBoardError(null)
    setBoardState('loading')
  }

  return {
    events,
    eventsState,
    eventsError,
    eventId,
    board,
    boardState,
    boardError,
    retryEvents: () => void loadEvents(),
    retryBoard: () => {
      if (eventId) void loadBoard(eventId)
    },
    changeEvent,
  }
}
