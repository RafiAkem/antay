import { useCallback, useEffect, useState } from 'react'
import { fetchWaiting } from '@/lib/api'
import type { Ticket } from '@/types/api'

const POLL_MS = 20_000

// Daftar menunggu diperbarui tiap 20 detik dan saat tab kembali terlihat.
// Tab yang tersembunyi tidak ikut memanggil server, karena tablet loket
// sering dibiarkan menyala seharian.
export function useWaitingTickets(eventId: string) {
  const [waiting, setWaiting] = useState<Ticket[]>([])
  const [waitingSlots, setWaitingSlots] = useState<string[]>([])

  const refreshWaiting = useCallback((id: string) => {
    return fetchWaiting(id)
      .then((data) => {
        setWaiting(data.tickets)
        setWaitingSlots(data.slots)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!eventId) {
      setWaiting([])
      setWaitingSlots([])
      return
    }
    void refreshWaiting(eventId)
    const timer = window.setInterval(() => {
      if (!document.hidden) void refreshWaiting(eventId)
    }, POLL_MS)
    const onVisible = () => {
      if (!document.hidden) void refreshWaiting(eventId)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [eventId, refreshWaiting])

  return { waiting, waitingSlots, refreshWaiting }
}
