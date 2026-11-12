import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/components/ui/cn'
import { Price } from '@/components/ui/price'
import type { CatalogEvent } from '@/types/catalog'
import { formatEventWhen } from './list/event-dates'
import { isSaleClosed } from './list/event-filters'
import { EventPoster } from './list/event-poster'

type EventCardSize = 'default' | 'compact'

type EventCardProps = {
  event: CatalogEvent
  size?: EventCardSize
}

const TITLE: Record<EventCardSize, string> = {
  default: 'text-[15px] leading-[21px] sm:text-base sm:leading-[22px]',
  compact: 'text-sm leading-5 sm:text-[15px] sm:leading-[21px]',
}

// Ambang "sisa sedikit" dalam jumlah tiket, karena kartu daftar tidak tahu
// kapasitas totalnya. Persentase baru bisa dipakai di halaman detail.
const SCARCE_BELOW = 50

// Lengkung cekung di kiri dan atas tab lokasi. Kotak 10px dengan sudut kiri
// bawah membulat, lalu bayangannya yang berwarna ground mengisi sisa kotak,
// jadi tab terlihat memotong foto tanpa gambar tambahan.
const EAR =
  'pointer-events-none absolute h-2.5 w-2.5 rounded-bl-[10px] shadow-[-5px_5px_0_5px_var(--color-ground)]'

export function EventCard({ event, size = 'default' }: EventCardProps) {
  const when = formatEventWhen(event.eventDate, event.openTime)

  return (
    <Link to={`/events/${event.id}`} className="group grid min-w-0 content-start gap-2.5 rounded-card">
      <div className="relative aspect-square overflow-hidden rounded-card bg-night">
        <EventPoster
          posterUrl={event.posterUrl}
          name={event.name}
          when={when}
          className="motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
        />
        {/* Scrim atas disiapkan untuk tab promo, supaya tetap terbaca di foto terang. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-linear-to-b from-night/35 to-transparent"
        />
        <div className="absolute bottom-0 left-0 flex max-w-[82%] items-center gap-1 rounded-tr-card bg-ground py-1 pr-2.5 pl-2 text-xs leading-4 font-semibold text-ink">
          <span aria-hidden="true" className={cn(EAR, 'bottom-full left-0')} />
          <span aria-hidden="true" className={cn(EAR, 'bottom-0 left-full')} />
          <PinGlyph />
          <span className="truncate">
            <span className="sr-only">Lokasi: </span>
            {event.place}
          </span>
        </div>
      </div>

      <div className="grid min-w-0 gap-1">
        <h3
          className={cn(
            'line-clamp-2 font-semibold tracking-[-0.005em] text-ink group-hover:text-accent-ink',
            TITLE[size],
          )}
        >
          {event.name}
        </h3>
        <p className="num text-[13px] leading-[18px] text-muted">{when}</p>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <PriceLine event={event} />
          <StockBadge event={event} />
        </div>
      </div>
    </Link>
  )
}

function PriceLine({ event }: { event: CatalogEvent }) {
  if (event.onSale && event.priceFrom !== null) {
    if (event.priceFrom === 0) {
      return <span className="text-[13px] leading-[18px] font-bold text-ink">Gratis</span>
    }
    return <Price amount={event.priceFrom} prefix="Mulai" size="sm" />
  }
  // Penjualan yang sudah ditutup beda arti dengan yang belum dibuka: yang
  // pertama tidak ada gunanya ditunggu.
  const closed = isSaleClosed(event)
  return (
    <span className="text-[13px] leading-[18px] font-semibold text-muted">
      {closed ? 'Penjualan ditutup' : 'Segera dijual'}
    </span>
  )
}

function StockBadge({ event }: { event: CatalogEvent }) {
  // Tanpa harga berarti belum ada kategori tiket, jadi left 0 di sini
  // bukan tanda habis terjual.
  if (event.priceFrom === null) return null
  if (event.left === 0) {
    return (
      <Badge tone="neutral" className="border border-border-soft">
        Habis
      </Badge>
    )
  }
  if (event.onSale && event.left < SCARCE_BELOW) {
    return <Badge tone="scarce">Sisa sedikit</Badge>
  }
  return null
}

function PinGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="flex-none text-muted">
      <path
        d="M6 10.8s3.6-3.3 3.6-6A3.6 3.6 0 0 0 2.4 4.8c0 2.7 3.6 6 3.6 6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="4.8" r="1.2" fill="currentColor" />
    </svg>
  )
}
