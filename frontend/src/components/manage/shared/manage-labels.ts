import { ApiError } from '@/lib/api'
import type { EventStatus, ManagedCategory } from '@/types/manage'

export type PillTone = 'ok' | 'bad' | 'warn' | 'brand' | 'neutral'

export const STATUS_LABEL: Record<EventStatus, string> = {
  draft: 'Draf',
  review: 'Menunggu',
  published: 'Tayang',
  closed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export const STATUS_TONE: Record<EventStatus, PillTone> = {
  draft: 'neutral',
  review: 'warn',
  published: 'ok',
  closed: 'brand',
  cancelled: 'bad',
}

// Event yang sudah tutup atau batal hanya bisa dilihat. Sisanya tetap bisa diubah;
// batasan setelah ada pesanan dibayar dijaga backend dan pesannya ditampilkan apa adanya.
export function isEditable(status: EventStatus): boolean {
  return status !== 'closed' && status !== 'cancelled'
}

const DATE_FORMAT = new Intl.DateTimeFormat('id-ID', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const LONG_DATE_FORMAT = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

// eventDate datang sebagai "YYYY-MM-DD" tanpa zona. new Date("2026-12-31") dibaca
// sebagai UTC dan bisa mundur sehari di zona barat, jadi bagian tanggalnya dipecah sendiri.
export function parseDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return date.getMonth() === Number(match[2]) - 1 ? date : null
}

export function formatEventDate(value: string): string {
  const date = parseDay(value)
  return date ? DATE_FORMAT.format(date) : value
}

export function formatLongDate(value: string): string | null {
  const date = parseDay(value)
  return date ? LONG_DATE_FORMAT.format(date) : null
}

// Harga termurah dari paket aktif, untuk kolom "Mulai dari" di daftar.
export function priceFrom(event: { categories?: ManagedCategory[] }): number | null {
  let lowest: number | null = null
  for (const category of event.categories ?? []) {
    for (const pack of category.packages ?? []) {
      if (!pack.isActive) continue
      if (lowest === null || pack.price < lowest) lowest = pack.price
    }
  }
  return lowest
}

export function bySortOrder<T extends { sortOrder: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder)
}

export function errorMessage(cause: unknown, fallback: string): string {
  // Pesan ApiError sudah berbahasa Indonesia dari server; galat lain (parse JSON dsb.) tidak.
  if (cause instanceof ApiError && cause.message) return cause.message
  return fallback
}
