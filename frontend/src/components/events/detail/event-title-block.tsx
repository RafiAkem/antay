import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Price } from '@/components/ui/price'
import { Heading, Paragraph } from '@/components/ui/text'
import type { CatalogEventDetail } from '@/types/catalog'
import { EventGlyph, type GlyphName } from './event-glyph'
import { clockLabel, eventDateLabel, saleStatusOf, shortMomentLabel } from './event-format'

// Judul, fakta singkat, harga mulai, dan status jual. Fakta ditulis seperti
// yang dibaca pembeli di poster, bukan nama field: "Tukar 18.00 sampai 23.30".
export function EventTitleBlock({ event }: { event: CatalogEventDetail }) {
  const sale = saleStatusOf(event)
  const facts: Array<{ glyph: GlyphName; label: string; text: string }> = [
    { glyph: 'calendar', label: 'Tanggal', text: eventDateLabel(event.eventDate) },
    {
      glyph: 'clock',
      label: 'Jam tukar',
      text: `Tukar ${clockLabel(event.openTime)} sampai ${clockLabel(event.closeTime)}`,
    },
    { glyph: 'pin', label: 'Tempat', text: event.place },
    { glyph: 'item', label: 'Yang ditukar', text: event.item },
    { glyph: 'id', label: 'Syarat', text: `Bawa ${event.requirement}` },
  ]

  return (
    <div className="grid content-start gap-4">
      <div className="grid gap-2">
        <Link to="/events" className="w-fit text-[13px] font-semibold text-muted hover:text-ink">
          Semua event
        </Link>
        <Heading level={1}>{event.name}</Heading>
      </div>

      <dl className="grid gap-2.5">
        {facts.map((fact) => (
          <div key={fact.glyph} className="flex items-start gap-2.5 text-sm leading-5">
            <dt className="mt-0.5 text-muted">
              <EventGlyph name={fact.glyph} />
              <span className="sr-only">{fact.label}</span>
            </dt>
            <dd className="min-w-0">{fact.text}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-2 border-t border-border-soft pt-4">
        {event.priceFrom !== null ? (
          <Price amount={event.priceFrom} prefix="Mulai" size="lg" />
        ) : (
          <Paragraph tone="muted">Harga belum diumumkan penyelenggara.</Paragraph>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={sale.tone}>{sale.label}</Badge>
          {sale.kind === 'upcoming' && event.saleStartsAt ? (
            <span className="text-xs text-muted">Dibuka {shortMomentLabel(event.saleStartsAt)}</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
