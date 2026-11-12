import type { CatalogEvent } from '@/types/catalog'
import { dayOf, isUpcoming, jakartaToday, matchesWhen, type WhenFilter } from './event-dates'

export type EventSort = 'soonest' | 'cheapest'

export const SORT_OPTIONS: Array<{ value: EventSort; label: string }> = [
  { value: 'soonest', label: 'Terdekat' },
  { value: 'cheapest', label: 'Termurah' },
]

export function parseSort(raw: string | null): EventSort {
  return raw === 'cheapest' ? 'cheapest' : 'soonest'
}

function startKey(event: CatalogEvent): string {
  return `${dayOf(event.eventDate)} ${event.openTime}`
}

export function bySoonest(a: CatalogEvent, b: CatalogEvent): number {
  return startKey(a).localeCompare(startKey(b))
}

// Event yang belum punya harga ditaruh paling bawah saat urut termurah:
// "Segera dijual" bukan berarti gratis.
function byCheapest(a: CatalogEvent, b: CatalogEvent): number {
  const left = a.priceFrom ?? Number.POSITIVE_INFINITY
  const right = b.priceFrom ?? Number.POSITIVE_INFINITY
  return left === right ? bySoonest(a, b) : left - right
}

// Katalog ini tempat beli tiket, jadi event yang tanggalnya sudah lewat
// tidak ikut tampil meskipun backend masih mengirimnya.
export function upcomingEvents(events: CatalogEvent[], today = jakartaToday()): CatalogEvent[] {
  return events.filter((event) => isUpcoming(event.eventDate, today)).sort(bySoonest)
}

// Jam sekarang dibaca saat kartu digambar. Kartu tidak diperbarui per detik,
// jadi label baru berganti di render berikutnya, dan itu cukup untuk daftar.
export function isSaleClosed(event: CatalogEvent, now = Date.now()): boolean {
  return !event.onSale && event.saleEndsAt !== null && new Date(event.saleEndsAt).getTime() < now
}

function normalize(text: string): string {
  return text.toLocaleLowerCase('id-ID').trim()
}

export function matchesQuery(event: CatalogEvent, query: string): boolean {
  const needle = normalize(query)
  if (!needle) return true
  return [event.name, event.place, event.item].some((field) => normalize(field).includes(needle))
}

type FilterInput = {
  query: string
  when: WhenFilter
  sort: EventSort
}

export function filterEvents(events: CatalogEvent[], { query, when, sort }: FilterInput): CatalogEvent[] {
  const today = jakartaToday()
  return events
    .filter((event) => matchesWhen(event.eventDate, when, today) && matchesQuery(event, query))
    .sort(sort === 'cheapest' ? byCheapest : bySoonest)
}
