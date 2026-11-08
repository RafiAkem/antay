import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHead } from '@/components/ui/card'
import { Checkbox, Input } from '@/components/ui/field'
import { Pill } from '@/components/ui/pill'
import type { ApiError } from '@/lib/api'
import type { Ticket, TicketCheck, TicketTiming } from '@/types/api'
import { Notice } from './notice'

export type LookupResult = { ticket: Ticket; check: TicketCheck }

const TIMING: Record<TicketTiming, { label: string; tone: 'ok' | 'warn' | 'bad' }> = {
  early: { label: 'Datang lebih awal', tone: 'warn' },
  on_time: { label: 'Sesuai slot', tone: 'ok' },
  late: { label: 'Terlambat', tone: 'warn' },
  past_slot: { label: 'Slot sudah lewat', tone: 'bad' },
}

function timeLabel(value: string | null): string {
  if (!value) return 'tidak tercatat'
  return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

type Props = {
  code: string
  item: string
  checking: boolean
  redeeming: boolean
  ktpChecked: boolean
  result: LookupResult | null
  error: ApiError | null
  onCodeChange: (value: string) => void
  onCheck: (event: FormEvent<HTMLFormElement>) => void
  onKtpChange: (checked: boolean) => void
  onRedeem: () => void
  onCancel: () => void
}

export function TicketLookup({
  code,
  item,
  checking,
  redeeming,
  ktpChecked,
  result,
  error,
  onCodeChange,
  onCheck,
  onKtpChange,
  onRedeem,
  onCancel,
}: Props) {
  const ticket = result?.ticket
  const check = result?.check
  const valid = check?.canRedeem && !check.wrongEvent && !check.alreadyRedeemed

  return (
    <Card>
      <CardHead title="Cek tiket" meta="kode di bawah QR" />
      <form className="grid grid-cols-[minmax(0,1fr)_auto] gap-2" noValidate onSubmit={onCheck}>
        <Input
          id="ticket-code"
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
          placeholder="RF-7K2Q"
          aria-label="Kode tiket"
          autoComplete="off"
          maxLength={8}
          className="h-[42px] font-mono text-base tracking-[0.04em] uppercase"
        />
        <Button type="submit" disabled={checking || !code.trim()} className="h-[42px]">
          {checking ? 'Memeriksa...' : 'Cek'}
        </Button>
      </form>

      <div className="mt-3.5 grid gap-3" aria-live="polite">
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
            Ditukar pukul {timeLabel(ticket.redeemedAt)} di loket {ticket.redeemedCounter ?? '-'}. Jangan serahkan{' '}
            {item} kedua kalinya.
          </Notice>
        ) : null}

        {ticket && check && !check.wrongEvent && !check.alreadyRedeemed && !check.canRedeem ? (
          <Notice tone="bad" title="Tiket tidak bisa ditukar">
            Status tiket ini tidak aktif untuk penukaran.
          </Notice>
        ) : null}

        {ticket && check && valid ? (
          <div className="grid gap-3 rounded-[var(--radius-card)] border border-border-soft bg-raised p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className="text-lg font-semibold">{ticket.visitorName}</b>
              <Pill tone={TIMING[check.timing].tone}>{TIMING[check.timing].label}</Pill>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-base font-semibold tracking-[0.04em]">{ticket.code}</span>
              <span className="text-[13px] text-muted">
                slot {ticket.slotStart}-{ticket.slotEnd}
              </span>
            </div>
            <Checkbox checked={ktpChecked} onChange={onKtpChange}>
              Nama di KTP cocok dengan nama di tiket
            </Checkbox>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onRedeem} disabled={!ktpChecked || redeeming}>
                {redeeming ? 'Memproses...' : `Serahkan ${item}`}
              </Button>
              <Button variant="ghost" onClick={onCancel} disabled={redeeming}>
                Batal
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  )
}
