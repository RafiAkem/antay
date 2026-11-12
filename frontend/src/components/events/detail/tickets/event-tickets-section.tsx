import { useMemo, useState } from 'react'
import { Empty } from '@/components/ui/pill'
import { Section } from '@/components/ui/section'
import { Heading, Paragraph } from '@/components/ui/text'
import type { CatalogEventDetail } from '@/types/catalog'
import { SECTION_SCROLL_MARGIN } from '../event-detail-labels'
import { checkoutPath, saleStatusOf, sortCategories } from '../event-format'
import { EventZoneMap } from './event-zone-map'
import { TicketCategoryRow } from './ticket-category-row'

// Bagian Tiket hanya memperlihatkan pilihan. Memilih paket, kursi, dan jumlah
// terjadi di checkout, supaya total berjalan cuma dihitung di satu tempat.
export function EventTicketsSection({ event }: { event: CatalogEventDetail }) {
  const categories = useMemo(() => sortCategories(event.categories), [event.categories])
  const maxLeft = useMemo(() => Math.max(0, ...categories.map((category) => category.left)), [categories])
  const [openId, setOpenId] = useState<string | null>(null)
  const sale = saleStatusOf(event)
  const hasSeats = categories.some((category) => category.isSeated)

  return (
    <Section id="tiket" labelledBy="tiket-title" pad="sm" className={SECTION_SCROLL_MARGIN}>
      <div className="mb-3 grid gap-1">
        <Heading level={2} id="tiket-title">
          Tiket
        </Heading>
        <Paragraph tone="muted" size="sm">
          {hasSeats
            ? 'Lihat letak tiap kategori di denah. Ketuk kursinya untuk langsung memesan, atau buka kategori untuk melihat paketnya.'
            : 'Buka kategori untuk melihat paketnya. Jumlah tiket dipilih di langkah berikutnya.'}
        </Paragraph>
      </div>

      {hasSeats ? <EventZoneMap eventId={event.id} categories={categories} buyable={sale.buyable} /> : null}

      {categories.length === 0 ? (
        <Empty
          title="Kategori tiket belum dibuka."
          hint="Penyelenggara masih menyiapkan harga dan kuota. Coba buka halaman ini lagi menjelang tanggal jual."
        />
      ) : (
        <ul className="overflow-hidden rounded-card border border-border-soft bg-surface">
          {categories.map((category) => (
            <TicketCategoryRow
              key={category.id}
              category={category}
              maxLeft={maxLeft}
              expanded={openId === category.id}
              onToggle={() => setOpenId((current) => (current === category.id ? null : category.id))}
              buyHref={checkoutPath(event.id, category.id)}
              buyable={sale.buyable}
            />
          ))}
        </ul>
      )}
    </Section>
  )
}
