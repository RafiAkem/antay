import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { shortMomentLabel, saleStatusOf } from '@/components/events/detail/event-format'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Paragraph } from '@/components/ui/text'
import type { CatalogEventDetail } from '@/types/catalog'

// Skeleton meniru susunan aslinya: header ringkas, daftar baris, kartu kanan.
export function CheckoutSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat checkout">
      <div className="border-b border-border-soft bg-surface">
        <Container className="flex items-center gap-3 py-3 lg:py-4">
          <Skeleton className="h-10 w-10" />
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-4 w-2/3 max-w-[320px]" />
            <Skeleton className="h-3 w-1/3 max-w-[180px]" />
          </div>
        </Container>
      </div>
      <Section pad="sm">
        <Container className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-3">
            <Skeleton className="h-6 w-48" />
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-[88px] w-full rounded-card" />
            ))}
          </div>
          <Skeleton className="hidden h-64 rounded-card lg:block" />
        </Container>
      </Section>
    </div>
  )
}

function Message({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <Section>
      <Container size="narrow" className="grid justify-items-start gap-3">
        <Heading level={1} size="lg">
          {title}
        </Heading>
        <Paragraph tone="muted">{hint}</Paragraph>
        <div className="mt-1 flex flex-wrap gap-2">{children}</div>
      </Container>
    </Section>
  )
}

const LINK_CLASS =
  'inline-flex h-10 items-center rounded-control border border-control bg-surface px-4 text-sm font-semibold transition-colors hover:bg-raised'

export function CheckoutMissing() {
  return (
    <Message title="Event ini tidak ditemukan." hint="Mungkin tautannya salah ketik atau eventnya sudah tidak tayang.">
      <Link to="/events" className={LINK_CLASS}>
        Lihat event lain
      </Link>
    </Message>
  )
}

export function CheckoutError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Message title="Checkout belum bisa dibuka." hint={message}>
      <Button onClick={onRetry}>Coba lagi</Button>
      <Link to="/events" className={LINK_CLASS}>
        Kembali ke daftar event
      </Link>
    </Message>
  )
}

// Penjualan tutup, belum buka, atau habis: jelaskan yang mana, lalu kembalikan
// pembeli ke halaman event. Keranjang lama tetap di storage kalau nanti dibuka lagi.
export function CheckoutClosed({ event }: { event: CatalogEventDetail }) {
  const sale = saleStatusOf(event)
  const hints: Record<string, string> = {
    'sold-out': 'Semua kuota tiket event ini sudah terjual. Pantau halaman event, kuota dari pesanan yang tidak dibayar bisa kembali dibuka.',
    upcoming: event.saleStartsAt
      ? `Tiket mulai dijual ${shortMomentLabel(event.saleStartsAt)}. Simpan halaman event ini dan kembali saat penjualan dibuka.`
      : 'Penyelenggara belum membuka penjualan tiket. Kembali lagi nanti.',
    ended: 'Penjualan tiket untuk event ini sudah ditutup.',
  }
  return (
    <Message title={`${event.name}: ${sale.label.toLowerCase()}.`} hint={hints[sale.kind] ?? 'Tiket event ini sedang tidak dijual.'}>
      <Link to={`/events/${encodeURIComponent(event.id)}`} className={LINK_CLASS}>
        Kembali ke halaman event
      </Link>
    </Message>
  )
}
