import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { Ticket } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Card, CardHead } from '@/components/ui/card'
import { Pill } from '@/components/ui/pill'
import { waitLabel } from '@/lib/format'

type StatusTone = 'ok' | 'bad' | 'brand' | 'neutral'

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

function statusOf(ticket: Ticket, past: boolean): { tone: StatusTone; label: string; detail: string } {
  if (ticket.status === 'redeemed') {
    return {
      tone: 'ok',
      label: 'Sudah ditukar',
      detail: ticket.redeemedCounter ? `Ditukar di loket ${ticket.redeemedCounter}.` : 'Sudah ditukar di loket.',
    }
  }
  if (ticket.status === 'cancelled') {
    return { tone: 'neutral', label: 'Dibatalkan', detail: 'Tiket ini sudah dibatalkan.' }
  }
  if (past) {
    return { tone: 'bad', label: 'Slot lewat', detail: 'Tetap bisa ditukar, mungkin menunggu lebih lama.' }
  }
  return {
    tone: 'brand',
    label: `Datang ${ticket.slotStart}`,
    detail: `Antrean sekarang ${ticket.queue.waiting} orang, perkiraan tunggu ${waitLabel(ticket.queue.waitMinutes)}.`,
  }
}

export function TicketCard({ ticket, tickets, onSelect, onCancel, cancelling }: Props) {
  const status = statusOf(ticket, ticket.slotEnd <= clockNow())
  // Halaman memasang key={ticket.code}, jadi berganti tiket membuat kartu baru dan menutup konfirmasi.
  const [confirming, setConfirming] = useState(false)
  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-surface">
        <div className="border-b border-tint-100 bg-tint-50 px-5 py-4">
          <span className="text-xs text-accent-ink">Tiket penukaran</span>
          <b className="mt-0.5 block text-base font-semibold leading-[22px]">{ticket.event.name}</b>
        </div>
        <div className="grid gap-4 p-5">
          <div className="grid gap-0.5">
            <span className="text-xs text-muted">Kode tiket</span>
            <span className="font-mono text-2xl font-semibold tracking-[0.04em]">{ticket.code}</span>
          </div>
          <div className="grid gap-0.5">
            <span className="text-[13px] text-muted">Jam datang</span>
            <strong className="num text-[32px] leading-[38px] font-semibold tracking-[-0.01em]">
              {ticket.slotStart}-{ticket.slotEnd}
            </strong>
          </div>
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[112px_minmax(0,1fr)]">
            <div className="grid h-28 w-28 place-items-center rounded-[var(--radius-control)] border border-border-soft bg-surface p-1 text-ink">
              <QRCodeSVG
                value={ticket.code}
                size={104}
                level="M"
                title={`Kode tiket ${ticket.code}`}
                fgColor="currentColor"
                bgColor="transparent"
              />
            </div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
              <dt className="text-muted">Nama</dt>
              <dd className="min-w-0 break-words">{ticket.visitorName}</dd>
              <dt className="text-muted">Loket</dt>
              <dd className="min-w-0 break-words">{ticket.event.place}</dd>
              <dt className="text-muted">Bawa</dt>
              <dd className="min-w-0 break-words">{ticket.event.requirement}</dd>
              <dt className="text-muted">Ditukar</dt>
              <dd className="min-w-0 break-words">{ticket.event.item}</dd>
            </dl>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-control px-5 py-3.5 text-[13px] text-muted">
          <Pill tone={status.tone}>{status.label}</Pill>
          <span>{status.detail}</span>
        </div>
        {ticket.status === 'booked' ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-soft px-5 py-3 text-[13px] text-muted">
            {confirming ? (
              <>
                <span className="mr-auto">Batalkan tiket ini? Tempatnya akan dilepas untuk orang lain.</span>
                {/* Tombol pemicu hilang saat konfirmasi terbuka, jadi fokus dipindah ke pilihan yang aman. */}
                <Button size="small" variant="ghost" onClick={() => setConfirming(false)} disabled={cancelling} autoFocus>
                  Tidak
                </Button>
                <Button size="small" variant="danger" onClick={() => onCancel(ticket.code)} disabled={cancelling}>
                  {cancelling ? 'Membatalkan…' : 'Ya, batalkan'}
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
                className={`flex items-center justify-between gap-3 border-t border-border-soft py-2.5 text-left text-[13px] first:border-t-0 hover:text-accent-ink ${
                  item.code === ticket.code ? 'text-accent-ink' : ''
                }`}
              >
                <span className="font-mono">{item.code}</span>
                <span className="truncate text-muted">
                  {item.event.name} · {item.slotStart}
                </span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
