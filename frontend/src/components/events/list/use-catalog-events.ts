import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/lib/api'
import { fetchCatalogEvents } from '@/lib/catalog-api'
import type { CatalogEvent } from '@/types/catalog'

export type CatalogLoadState = 'loading' | 'ready' | 'error'

// Dipakai beranda dan halaman Event. Tiap percobaan punya AbortController
// sendiri, jadi jawaban yang telat dari percobaan lama tidak menimpa yang baru.
// "Coba lagi" cukup menaikkan attempt; status loading dipasang di situ, bukan
// di dalam efek, supaya efeknya hanya mengurus permintaan.
export function useCatalogEvents() {
  const [events, setEvents] = useState<CatalogEvent[]>([])
  const [state, setState] = useState<CatalogLoadState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchCatalogEvents(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setEvents(data)
        setState('ready')
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setError(
          cause instanceof ApiError ? cause.message : 'Koneksi ke server terputus. Periksa internet lalu coba lagi.',
        )
        setState('error')
      })
    return () => controller.abort()
  }, [attempt])

  const reload = useCallback(() => {
    setState('loading')
    setError(null)
    setAttempt((value) => value + 1)
  }, [])

  return { events, state, error, reload }
}
