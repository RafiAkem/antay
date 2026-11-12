import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { Ticket } from '@/types/api'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHead } from '@/components/ui/card'
import { waitLabel } from '@/lib/format'
import { clockLabel } from './detail/event-format'

type Props = {
  ticket: Ticket
  tickets: Ticket[]
  onSelect: (code: string) => void
  onCancel: (code: string) => void
  cancelling: boolean
}

function clockNow(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function statusOf(ticket: Ticket, past: boolean): { tone: BadgeTone; label: string; detail: string } {
  if (ticket.status === 'redeemed') {
    return {
      tone: 'positive',
      label: 'Sudah ditukar',
      detail: ticket.redeemedCounter ? `Ditukar di loket ${ticket.redeemedCounter}.` : 'Sudah ditukar di loket.',
    }
  }
  if (ticket.status === 'cancelled') {
    return { tone: 'neutral', label: 'Dibatalkan', detail: 'Tiket ini sudah dibatalkan.' }
  }
  if (past) {
    return { tone: 'scarce', label: 'Slot lewat', detail: 'Tetap bisa ditukar lewat antrean umum, mungkin menunggu lebih lama.' }
  }
  return {
    tone: 'accent',
    label: `Datang ${clockLabel(ticket.slotStart)}`,
    detail: `Antrean sekarang ${ticket.queue.waiting} orang, perkiraan tunggu ${waitLabel(ticket.queue.waitMinutes)}.`,
  }
}

// Ticket stub malam: bagian atas berisi kode dan QR, garis sobek dengan dua
// takik, lalu status. QR tetap di kotak putih karena pemindai loket butuh
// kontras gelap di atas terang, bukan sebaliknya.
export function TicketCard({ ticket, tickets, onSelect, onCancel, cancelling }: Props) {
  const status = statusOf(ticket, ticket.slotEnd <= clockNow())
  // Halaman memasang key={ticket.code}, jadi berganti tiket membuat kartu baru dan menutup konfirmasi.
  const [confirming, setConfirming] = useState(false)
  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <article
          aria-label={`Tiket ${ticket.code}`}
          className="overflow-hidden rounded-card bg-night text-board-ink"
        >
          <div className="grid gap-1 px-5 pt-5">
            <span className="font-mono text-[11px] tracking-[0.12em] text-board-dim uppercase">E-ticket penukaran</span>
            <b className="text-base leading-[22px] font-bold">{ticket.event.name}</b>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 px-5 py-4">
            <div className="grid gap-3">
              <div className="grid gap-0.5">
                <span className="text-xs text-board-dim">Kode tiket</span>
                <span className="font-mono text-2xl leading-8 font-semibold tracking-[0.04em]">{ticket.code}</span>
              </div>
              <div className="grid gap-0.5">
                <span className="text-xs text-board-dim">Jam datang</span>
                <strong className="num text-[28px] leading-[34px] font-bold tracking-[-0.01em]">
                  {clockLabel(ticket.slotStart)}-{clockLabel(ticket.slotEnd)}
                </strong>
              </div>
            </div>
            <div className="grid h-28 w-28 place-items-center rounded-control bg-surface p-1.5 text-ink">
              <QRCodeSVG
                value={ticket.code}
                size={100}
                level="M"
                title={`Kode tiket ${ticket.code}`}
                fgColor="currentColor"
                bgColor="transparent"
              />
            </div>
          </div>

          <div aria-hidden="true" className="relative border-t border-dashed border-board-line">
            <span className="absolute -top-2.5 -left-2.5 h-5 w-5 rounded-pill bg-ground" />
            <span className="absolute -top-2.5 -right-2.5 h-5 w-5 rounded-pill bg-ground" />
          </div>

          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 px-5 py-4 text-[13px]">
            <dt className="text-board-dim">Nama</dt>
            <dd className="min-w-0 break-words">{ticket.visitorName}</dd>
            <dt className="text-board-dim">Loket</dt>
            <dd className="min-w-0 break-words">{ticket.event.place}</dd>
            <dt className="text-board-dim">Bawa</dt>
            <dd className="min-w-0 break-words">{ticket.event.requirement}</dd>
            <dt className="text-board-dim">Ditukar</dt>
            <dd className="min-w-0 break-words">{ticket.event.item}</dd>
          </dl>

          <div className="flex flex-wrap items-center gap-2 border-t border-board-line px-5 py-3.5 text-[13px] text-board-dim">
            <Badge tone={status.tone}>{status.label}</Badge>
            <span>{status.detail}</span>
          </div>
        </article>

        {ticket.status === 'booked' ? (
          <div className="flex flex-wrap items-center justify-end gap-2 text-[13px] text-muted">
            {confirming ? (
              <>
                <span className="mr-auto">Batalkan tiket ini? Tempatnya akan dilepas untuk orang lain.</span>
                {/* Tombol pemicu hilang saat konfirmasi terbuka, jadi fokus dipindah ke pilihan yang aman. */}
                <Button size="small" variant="ghost" onClick={() => setConfirming(false)} disabled={cancelling} autoFocus>
                  Tidak
                </Button>
                <Button size="small" variant="danger" onClick={() => onCancel(ticket.code)} disabled={cancelling}>
                  {cancelling ? 'Membatalkan...' : 'Ya, batalkan'}
                </Button>
              </>
            ) : (
              <Button size="small" variant="ghost" onClick={() => setConfirming(true)}>
                Batalkan tiket
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {tickets.length > 1 ? (
        <Card>
          <CardHead title="Tiket saya" meta={`${tickets.length} tiket`} />
          <div className="grid">
            {tickets.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => onSelect(item.code)}
                aria-pressed={item.code === ticket.code}
                className={`flex min-h-11 items-center justify-between gap-3 border-t border-border-soft py-2.5 text-left text-[13px] first:border-t-0 hover:text-accent-ink ${
                  item.code === ticket.code ? 'font-semibold text-accent-ink' : ''
                }`}
              >
                <span className="font-mono">{item.code}</span>
                <span className="truncate text-muted">
                  {item.event.name} · {clockLabel(item.slotStart)}
                </span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
