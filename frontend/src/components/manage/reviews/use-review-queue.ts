import { useCallback, useEffect, useState } from 'react'
import { fetchManagedEvents } from '@/lib/manage-api'
import { fillCategories, type ListedEvent } from '../shared/listed-event'
import { errorMessage } from '../shared/manage-labels'
import { useEventTransition } from '../shared/use-event-transition'

// Antrean persetujuan: hanya event berstatus review, yang paling lama menunggu di atas.
export function useReviewQueue() {
  const [events, setEvents] = useState<ListedEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [settled, setSettled] = useState(-1)

  const reload = useCallback(() => setVersion((value) => value + 1), [])
  const transition = useEventTransition(reload)

  useEffect(() => {
    const controller = new AbortController()
    fetchManagedEvents('review', controller.signal)
      .then(async (list) => {
        const sorted = [...list].sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''))
        setEvents(sorted)
        setError(null)
        setSettled(version)
        // Kategori dan paket dibutuhkan untuk ringkasan harga di tiap baris.
        const filled = await fillCategories(sorted, controller.signal)
        if (!controller.signal.aborted) setEvents(filled)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(cause, 'Antrean belum bisa dimuat. Coba lagi.'))
      })
      .finally(() => {
        if (!controller.signal.aborted) setSettled(version)
      })
    return () => controller.abort()
  }, [version])

  // Hanya muatan pertama yang menampilkan skeleton; muat ulang setelah setujui/tolak
  // tetap menampilkan daftar lama sampai yang baru datang.
  const loading = settled === -1
  return { events, loading, error, reload, transition }
}
