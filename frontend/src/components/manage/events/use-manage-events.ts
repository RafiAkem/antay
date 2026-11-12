import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { fetchManagedEvents } from '@/lib/manage-api'
import type { EventStatus } from '@/types/manage'
import { fillCategories, type ListedEvent } from '../shared/listed-event'
import { errorMessage } from '../shared/manage-labels'

export type StatusTab = 'all' | 'draft' | 'review' | 'published' | 'done'

export const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'draft', label: 'Draf' },
  { value: 'review', label: 'Menunggu' },
  { value: 'published', label: 'Tayang' },
  { value: 'done', label: 'Selesai' },
]

// "Selesai" mencakup yang ditutup dan dibatalkan: dua-duanya sudah tidak dijual.
function matchesTab(status: EventStatus, tab: StatusTab): boolean {
  if (tab === 'all') return true
  if (tab === 'done') return status === 'closed' || status === 'cancelled'
  return status === tab
}

// Daftar event satu penyelenggara kecil dan tidak berhalaman, jadi diambil sekali
// lalu disaring di klien. Hitungan per tab jadi gratis dan pindah tab tidak menunggu.
export function useManageEvents() {
  const [events, setEvents] = useState<ListedEvent[]>([])
  // loading diturunkan dari percobaan mana yang sudah selesai, bukan di-set di effect
  const [settled, setSettled] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<StatusTab>('all')
  const [query, setQuery] = useState('')
  const [attempt, setAttempt] = useState(0)
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    const controller = new AbortController()
    fetchManagedEvents(undefined, controller.signal)
      .then(async (list) => {
        setEvents(list)
        setError(null)
        setSettled(attempt)
        const filled = await fillCategories(list, controller.signal)
        if (!controller.signal.aborted) setEvents(filled)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setError(errorMessage(cause, 'Daftar event belum bisa dimuat. Coba lagi sebentar lagi.'))
      })
      .finally(() => {
        if (!controller.signal.aborted) setSettled(attempt)
      })
    return () => controller.abort()
  }, [attempt])

  const counts = useMemo(() => {
    const result: Record<StatusTab, number> = { all: 0, draft: 0, review: 0, published: 0, done: 0 }
    for (const event of events) {
      for (const item of STATUS_TABS) if (matchesTab(event.status, item.value)) result[item.value] += 1
    }
    return result
  }, [events])

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase()
    return events
      .filter((event) => matchesTab(event.status, tab))
      .filter(
        (event) =>
          !needle ||
          event.name.toLowerCase().includes(needle) ||
          event.place.toLowerCase().includes(needle) ||
          event.codePrefix.toLowerCase().includes(needle),
      )
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate))
  }, [events, tab, deferredQuery])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  const loading = settled !== attempt

  return { events, visible, counts, loading, error, tab, setTab, query, setQuery, retry }
}
