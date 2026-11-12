import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseWhen, type WhenFilter } from './event-dates'
import { filterEvents, parseSort, upcomingEvents, type EventSort } from './event-filters'
import { useCatalogEvents } from './use-catalog-events'

// Filter disimpan di URL (q, when, sort) supaya tautan dari beranda, tombol
// kembali, dan tautan yang dibagikan ke teman membuka daftar yang sama.
// Nilai bawaan dihapus dari URL biar alamatnya tetap pendek.
export function useEventsPage() {
  const catalog = useCatalogEvents()
  const [params, setParams] = useSearchParams()

  const query = params.get('q') ?? ''
  const when = parseWhen(params.get('when'))
  const sort = parseSort(params.get('sort'))

  const upcoming = useMemo(() => upcomingEvents(catalog.events), [catalog.events])
  const results = useMemo(() => filterEvents(upcoming, { query, when, sort }), [upcoming, query, when, sort])

  function update(key: 'q' | 'when' | 'sort', value: string, fallback: string) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value && value !== fallback) next.set(key, value)
        else next.delete(key)
        return next
      },
      // Mengetik di kolom cari tidak boleh menumpuk riwayat per huruf.
      { replace: key === 'q' },
    )
  }

  return {
    ...catalog,
    query,
    when,
    sort,
    total: upcoming.length,
    results,
    filtered: query.trim() !== '' || when !== 'all',
    setQuery: (value: string) => update('q', value, ''),
    setWhen: (value: WhenFilter) => update('when', value, 'all'),
    setSort: (value: EventSort) => update('sort', value, 'soonest'),
    reset: () => setParams(sort === 'soonest' ? {} : { sort }),
  }
}
