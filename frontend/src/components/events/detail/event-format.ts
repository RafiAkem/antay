import type { CatalogCategory, CatalogEventDetail } from '@/types/catalog'

// Semua jam event dihitung di Jakarta (PRD bagian 6), jadi tampilannya juga
// dikunci ke sana. Tanpa ini, pembeli yang ponselnya di zona lain melihat jam geser.
const ZONE = 'Asia/Jakarta'

// Jam dari server berbentuk "18:00". Penulisan Indonesia memakai titik.
export function clockLabel(time: string): string {
  return time.replace(':', '.')
}

// eventDate berupa "2026-12-31" tanpa jam. Ditempel +07:00 supaya tidak mundur
// sehari di browser yang zonanya di belakang UTC.
export function eventDateLabel(eventDate: string): string {
  const date = new Date(`${eventDate}T00:00:00+07:00`)
  if (Number.isNaN(date.getTime())) return eventDate
  return date.toLocaleDateString('id-ID', {
    timeZone: ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// "31 Des 18.00". Disusun dari bagian-bagiannya karena toLocaleString id-ID
// menyelipkan kata "pukul" yang terlalu panjang untuk badge.
export function shortMomentLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const parts = new Intl.DateTimeFormat('id-ID', {
    timeZone: ZONE,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${pick('day')} ${pick('month').replace('.', '')} ${pick('hour')}.${pick('minute')}`
}

export type SaleStatus = {
  kind: 'open' | 'sold-out' | 'upcoming' | 'ended'
  tone: 'accent' | 'neutral' | 'scarce'
  label: string
  // boleh dipencet atau tidak; tombol beli ikut nilai ini
  buyable: boolean
  // teks tombol saat tidak bisa beli
  blockedLabel: string
}

export function saleStatusOf(event: CatalogEventDetail): SaleStatus {
  if (event.onSale) {
    if (event.left <= 0) {
      return { kind: 'sold-out', tone: 'scarce', label: 'Tiket habis terjual', buyable: false, blockedLabel: 'Tiket habis' }
    }
    return {
      kind: 'open',
      tone: 'accent',
      label: event.saleEndsAt ? `Dijual sampai ${shortMomentLabel(event.saleEndsAt)}` : 'Sedang dijual',
      buyable: true,
      blockedLabel: '',
    }
  }
  // Belum dibuka hanya kalau jam bukanya memang masih di depan. Selain itu
  // (lewat batas, atau ditutup penyelenggara) dianggap selesai.
  const startsAt = event.saleStartsAt ? new Date(event.saleStartsAt).getTime() : NaN
  if (!Number.isNaN(startsAt) && startsAt > Date.now()) {
    return { kind: 'upcoming', tone: 'neutral', label: 'Penjualan belum dibuka', buyable: false, blockedLabel: 'Belum dibuka' }
  }
  return { kind: 'ended', tone: 'neutral', label: 'Penjualan selesai', buyable: false, blockedLabel: 'Penjualan selesai' }
}

// Termurah di atas (docs/ui-direction.md). Kategori tanpa harga ditaruh paling
// bawah, lalu urutan penyelenggara jadi penentu kalau harganya sama.
export function sortCategories(categories: CatalogCategory[]): CatalogCategory[] {
  return [...categories].sort((a, b) => {
    const priceA = a.priceFrom ?? Number.POSITIVE_INFINITY
    const priceB = b.priceFrom ?? Number.POSITIVE_INFINITY
    if (priceA !== priceB) return priceA - priceB
    return a.sortOrder - b.sortOrder
  })
}

export function checkoutPath(eventId: string, categoryId?: string): string {
  const base = `/events/${encodeURIComponent(eventId)}/checkout`
  return categoryId ? `${base}?category=${encodeURIComponent(categoryId)}` : base
}

// Di bawah angka ini sisa kursi atau kuota diberi badge scarce.
export const SCARCE_LEFT = 30
