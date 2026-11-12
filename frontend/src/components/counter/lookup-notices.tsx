import type { ApiError } from '@/lib/api'
import type { Ticket, TicketCheck } from '@/types/api'
import { Notice } from './notice'

function timeLabel(value: string | null): string {
  if (!value) return 'tidak tercatat'
  return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

type Props = {
  error: ApiError | null
  ticket: Ticket | null
  check: TicketCheck | null
  item: string
}

// Semua alasan tiket tidak bisa diserahkan, dalam kalimat yang bisa langsung
// dibacakan petugas ke pengunjung.
export function LookupNotices({ error, ticket, check, item }: Props) {
  return (
    <>
      {error ? (
        <Notice tone="bad" title={error.status === 404 ? 'Kode tidak ditemukan' : 'Tiket tidak bisa ditukar'}>
          {error.message}
        </Notice>
      ) : null}

      {ticket && check?.wrongEvent ? (
        <Notice tone="warn" title="Tiket ini untuk event lain">
          {ticket.event.name} di {ticket.event.place}. Arahkan pengunjung ke loket event itu.
        </Notice>
      ) : null}

      {ticket && check?.alreadyRedeemed && !check.wrongEvent ? (
        <Notice tone="bad" title="Tiket sudah ditukar">
          Ditukar pukul {timeLabel(ticket.redeemedAt)} di loket {ticket.redeemedCounter ?? '-'}. Jangan serahkan {item}{' '}
          kedua kalinya.
        </Notice>
      ) : null}

      {ticket && check && !check.wrongEvent && !check.alreadyRedeemed && !check.canRedeem ? (
        <Notice tone="bad" title="Tiket tidak bisa ditukar">
          Status tiket ini tidak aktif untuk penukaran.
        </Notice>
      ) : null}
    </>
  )
}
