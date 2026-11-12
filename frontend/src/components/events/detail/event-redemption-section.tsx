import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Empty } from '@/components/ui/pill'
import { Section } from '@/components/ui/section'
import { Heading, Paragraph } from '@/components/ui/text'
import type { CatalogEventDetail } from '@/types/catalog'
import { SlotGrid } from '../slot-grid'
import { EventGlyph } from './event-glyph'
import { SECTION_SCROLL_MARGIN } from './event-detail-labels'
import { clockLabel, eventDateLabel } from './event-format'

// Slot paling lengang di antara empat slot berikutnya yang masih buka, aturan
// yang sama dengan saran "sepi" versi 1.
function quietestStart(event: CatalogEventDetail): string | null {
  const upcoming = event.slots.filter((slot) => !slot.past && slot.left > 0).slice(0, 4)
  if (upcoming.length < 2) return null
  return upcoming.reduce((best, slot) => (slot.booked / slot.capacity < best.booked / best.capacity ? slot : best)).start
}

export function EventRedemptionSection({ event }: { event: CatalogEventDetail }) {
  const quiet = useMemo(() => quietestStart(event), [event])
  const steps = [
    'Setelah pembayaran berhasil, e-ticket muncul di Tiket saya. Tiap orang dapat kode dan QR sendiri.',
    `Pilih jam tukar dari slot di bawah. Satu slot ${event.slotMinutes} menit dengan kuota terbatas, supaya loket tidak menumpuk.`,
    `Datang ke ${event.place} pada jam itu dan bawa ${event.requirement}. Petugas mencocokkan nama di tiket dengan KTP, lalu menyerahkan ${event.item.toLowerCase()}.`,
  ]

  return (
    <Section id="penukaran" labelledBy="penukaran-title" pad="sm" className={SECTION_SCROLL_MARGIN}>
      <Heading level={2} id="penukaran-title" className="mb-1">
        Penukaran
      </Heading>
      <Paragraph tone="muted" size="sm" className="mb-4">
        Tiket ditukar dengan {event.item.toLowerCase()} di loket, {clockLabel(event.openTime)} sampai{' '}
        {clockLabel(event.closeTime)}.
      </Paragraph>

      <ol className="mb-5 grid gap-3">
        {steps.map((step, index) => (
          <li key={index} className="flex gap-3 text-sm leading-[21px]">
            <span className="num grid h-6 w-6 flex-none place-items-center rounded-pill bg-tint-100 text-xs font-bold text-accent-ink">
              {index + 1}
            </span>
            <span className="min-w-0">{step}</span>
          </li>
        ))}
      </ol>

      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <Heading level={3}>Sisa kuota slot, {eventDateLabel(event.eventDate)}</Heading>
        <Link
          to="/board"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent-ink hover:underline"
        >
          Lihat antrean loket
          <EventGlyph name="arrow" size={14} />
        </Link>
      </div>
      {event.slots.length > 0 ? (
        <>
          <SlotGrid slots={event.slots} quietStart={quiet} />
          <Paragraph tone="muted" size="sm" className="mt-2">
            Hanya informasi, belum memesan apa pun. Label sepi menandai slot paling lengang di antara empat slot
            berikutnya.
          </Paragraph>
        </>
      ) : (
        <Empty
          title="Slot tukar belum diatur."
          hint="Penyelenggara belum membuka jam loket. Kamu tetap bisa membeli; jam tukar dipilih setelah bayar."
        />
      )}
      <Paragraph tone="muted" size="sm" className="mt-3">
        Terlewat jam yang dipilih atau lupa memilih? Tiket tetap bisa ditukar lewat antrean umum, hanya mungkin
        menunggu lebih lama.
      </Paragraph>
    </Section>
  )
}
