import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/lib/api'
import { fetchCatalogEvent } from '@/lib/catalog-api'
import type { CatalogEventDetail } from '@/types/catalog'

export type CheckoutEventState =
  | { status: 'loading' }
  | { status: 'ready'; event: CatalogEventDetail }
  | { status: 'missing' }
  | { status: 'error'; message: string }

type Result = { id: string; attempt: number; state: CheckoutEventState }

// Status loading diturunkan dari id dan percobaan yang sedang diminta, bukan
// diset di dalam effect, jadi pindah event langsung memperlihatkan skeleton.
export function useCheckoutEvent(eventId: string) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchCatalogEvent(eventId, controller.signal).then(
      (event) => setResult({ id: eventId, attempt, state: { status: 'ready', event } }),
      (error: unknown) => {
        if (controller.signal.aborted) return
        const state: CheckoutEventState =
          error instanceof ApiError && error.status === 404
            ? { status: 'missing' }
            : { status: 'error', message: error instanceof ApiError ? error.message : 'Data event belum bisa dimuat. Periksa koneksi lalu coba lagi.' }
        setResult({ id: eventId, attempt, state })
      },
    )
    return () => controller.abort()
  }, [eventId, attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  const current = result && result.id === eventId && result.attempt === attempt ? result.state : { status: 'loading' as const }
  return { state: current, retry }
}
