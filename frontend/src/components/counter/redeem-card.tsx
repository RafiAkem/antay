import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/field'
import { Pill } from '@/components/ui/pill'
import type { Ticket, TicketCheck, TicketTiming } from '@/types/api'

const TIMING: Record<TicketTiming, { label: string; tone: 'ok' | 'warn' | 'bad' }> = {
  early: { label: 'Datang lebih awal', tone: 'warn' },
  on_time: { label: 'Sesuai slot', tone: 'ok' },
  late: { label: 'Terlambat', tone: 'warn' },
  past_slot: { label: 'Slot sudah lewat', tone: 'bad' },
}

type Props = {
  ticket: Ticket
  check: TicketCheck
  item: string
  ktpChecked: boolean
  redeeming: boolean
  onKtpChange: (checked: boolean) => void
  onRedeem: () => void
  onCancel: () => void
}

// Tiket valid: nama pemegang dibuat paling besar karena itu yang dicocokkan
// dengan KTP. Tombol serah baru aktif setelah centang KTP.
export function RedeemCard({ ticket, check, item, ktpChecked, redeeming, onKtpChange, onRedeem, onCancel }: Props) {
  const timing = TIMING[check.timing]

  return (
    <div className="grid gap-3 rounded-card border border-positive bg-positive-bg/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <b className="min-w-0 text-xl leading-7 font-bold break-words">{ticket.visitorName}</b>
        <Pill tone={timing.tone}>{timing.label}</Pill>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-base font-semibold tracking-[0.04em]">{ticket.code}</span>
        <span className="num text-[13px] text-muted">
          slot {ticket.slotStart}-{ticket.slotEnd}
        </span>
      </div>
      <div className="rounded-control bg-surface px-3 py-2.5">
        <Checkbox checked={ktpChecked} onChange={onKtpChange}>
          Nama di KTP cocok dengan nama di tiket
        </Checkbox>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex">
        <Button size="large" onClick={onRedeem} disabled={!ktpChecked || redeeming} className="min-w-0">
          <span className="truncate">{redeeming ? 'Memproses...' : `Serahkan ${item}`}</span>
        </Button>
        <Button size="large" variant="ghost" onClick={onCancel} disabled={redeeming}>
          Batal
        </Button>
      </div>
    </div>
  )
}
