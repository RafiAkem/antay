import { Card, CardHead } from '@/components/ui/card'
import { Paragraph } from '@/components/ui/text'
import type { ManagedEvent } from '@/types/manage'

// Halaman publik hanya menampilkan event Tayang, jadi pratinjau untuk draf
// akan menampilkan "tidak ditemukan". Itu disebut terang-terangan di sini.
export function PreviewPanel({ event }: { event: ManagedEvent }) {
  const live = event.status === 'published'
  return (
    <Card className="grid gap-3">
      <CardHead title="Halaman event untuk pembeli" />
      <Paragraph tone="muted">
        {live
          ? 'Event ini sedang tayang. Halaman di bawah sama persis dengan yang dilihat pembeli.'
          : 'Halaman publik baru bisa dibuka setelah event disetujui admin dan berstatus Tayang. Sebelum itu tautan ini menampilkan halaman tidak ditemukan.'}
      </Paragraph>
      <a
        href={`/events/${encodeURIComponent(event.id)}`}
        target="_blank"
        rel="noopener"
        className="inline-flex h-10 items-center justify-self-start rounded-control border border-control bg-surface px-4 text-sm font-semibold hover:bg-raised"
      >
        Buka halaman event
        <span className="sr-only"> (tab baru)</span>
      </a>
      <p className="font-mono text-xs break-all text-muted">/events/{event.id}</p>
    </Card>
  )
}
