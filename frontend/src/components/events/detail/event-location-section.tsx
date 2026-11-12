import { Section } from '@/components/ui/section'
import { Heading, Paragraph } from '@/components/ui/text'
import { EventGlyph } from './event-glyph'
import { SECTION_SCROLL_MARGIN, VENUE } from './event-detail-labels'

// Sengaja tanpa iframe peta: berat di ponsel dan memuat skrip pihak ketiga.
// Tautan ke Google Maps sudah cukup untuk petunjuk arah.
export function EventLocationSection({ place }: { place: string }) {
  return (
    <Section id="lokasi" labelledBy="lokasi-title" pad="sm" className={SECTION_SCROLL_MARGIN}>
      <Heading level={2} id="lokasi-title" className="mb-3">
        Lokasi
      </Heading>
      <div className="flex items-start gap-3 rounded-card border border-border-soft bg-surface p-4 sm:p-5">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-control bg-tint-50 text-accent">
          <EventGlyph name="pin" size={20} />
        </span>
        <div className="grid min-w-0 gap-1">
          <span className="text-[15px] leading-[22px] font-bold">{VENUE.name}</span>
          <Paragraph size="sm">{place}</Paragraph>
          <Paragraph tone="muted" size="sm">
            {VENUE.address}
          </Paragraph>
          <a
            href={VENUE.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex w-fit items-center gap-1 text-[13px] font-semibold text-accent-ink hover:underline"
          >
            Buka di Google Maps
            <EventGlyph name="external" size={14} />
            <span className="sr-only">(tab baru)</span>
          </a>
        </div>
      </div>
    </Section>
  )
}
