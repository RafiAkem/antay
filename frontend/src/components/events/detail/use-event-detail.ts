import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/lib/api'
import { fetchCatalogEvent } from '@/lib/catalog-api'
import type { CatalogEventDetail } from '@/types/catalog'

export type EventDetailState =
  | { status: 'loading' }
  | { status: 'ready'; event: CatalogEventDetail }
  | { status: 'missing' }
  | { status: 'error'; message: string }

type Settled = Exclude<EventDetailState, { status: 'loading' }> & { key: string }

// Satu sumber data untuk seluruh halaman detail. Hasil disimpan bersama kunci
// permintaannya (eventId + percobaan ke berapa); selama kuncinya belum cocok
// dengan permintaan sekarang, statusnya loading. Dengan begitu effect tidak
// perlu mengosongkan state sendiri, dan hasil dari event lama otomatis diabaikan.
export function useEventDetail(eventId: string) {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)
  const key = `${eventId}:${attempt}`

  useEffect(() => {
    const controller = new AbortController()
    fetchCatalogEvent(eventId, controller.signal)
      .then((event) => setSettled({ key, status: 'ready', event }))
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        if (cause instanceof ApiError && cause.status === 404) {
          setSettled({ key, status: 'missing' })
          return
        }
        setSettled({
          key,
          status: 'error',
          message:
            cause instanceof ApiError ? cause.message : 'Koneksi ke server terputus. Periksa internet lalu coba lagi.',
        })
      })
    return () => controller.abort()
  }, [eventId, key])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  const state: EventDetailState = settled && settled.key === key ? settled : { status: 'loading' }

  return { state, retry }
}
