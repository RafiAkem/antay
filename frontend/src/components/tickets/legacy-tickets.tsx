import { TicketCard } from '@/components/events/ticket-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading, Paragraph } from '@/components/ui/text'
import { useLegacyTickets } from './use-legacy-tickets'

function noop() {}

// Jadwal tukar gratis dari versi pertama, yang kodenya tersimpan di perangkat
// ini. Bagian ini hilang sendiri kalau tidak ada isinya.
export function LegacyTickets() {
  const { tickets, cancelling, cancel } = useLegacyTickets()

  if (tickets !== null && tickets.length === 0) return null

  return (
    <section aria-labelledby="legacy-title" className="grid gap-4">
      <div className="grid gap-1">
        <Heading level={2} id="legacy-title">
          Jadwal tukar dari versi sebelumnya
        </Heading>
        <Paragraph tone="muted">
          Kode penukaran yang dulu kamu ambil di perangkat ini. Tunjukkan QR-nya di loket seperti biasa.
        </Paragraph>
      </div>

      {tickets === null ? (
        <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
          <span className="sr-only" role="status">
            Memuat jadwal tukar...
          </span>
          <Skeleton className="h-[420px] rounded-card" />
          <Skeleton className="hidden h-[420px] rounded-card lg:block" />
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {/* tickets={[ticket]} supaya tiap kartu tidak ikut menggambar daftar pemilih tiket */}
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.code}
              ticket={ticket}
              tickets={[ticket]}
              onSelect={noop}
              onCancel={(code) => void cancel(code)}
              cancelling={cancelling}
            />
          ))}
        </div>
      )}
    </section>
  )
}
