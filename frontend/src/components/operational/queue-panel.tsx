import { Card, CardHead } from '@/components/ui/card'
import type { EventDetail } from '@/types/api'
import { Notice } from './notice'
import { queueOf } from './queue'
import { Stepper } from './stepper'

function Figure({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="grid gap-0.5 px-3.5 py-3">
      <span className="text-[13px] text-muted">{label}</span>
      <strong className="num text-2xl leading-7 font-semibold">
        {value}
        <small className="ml-1 text-sm font-normal text-muted">{unit}</small>
      </strong>
    </div>
  )
}

export function QueuePanel({
  event,
  waitingCount,
  onWaitingChange,
}: {
  event: EventDetail
  waitingCount: number
  onWaitingChange: (value: number) => void
}) {
  const queue = queueOf({ ...event, waitingCount })
  const extra = Math.max(0, queue.countersNeeded - event.counterCount)

  return (
    <Card>
      <CardHead title="Antrean di loket" meta="koreksi manual" />

      <div className="grid grid-cols-3 divide-x divide-border-soft rounded-[var(--radius-card)] border border-border-soft">
        <Figure label="Perkiraan tunggu" value={queue.waitMinutes} unit="mnt" />
        <Figure label="Orang antre" value={queue.waiting} unit="orang" />
        <Figure label="Loket buka" value={event.counterCount} unit="loket" />
      </div>

      <div className="mt-3.5">
        {queue.long ? (
          <Notice tone="warn" title="Tunggu lebih dari 15 menit.">
            Buka {extra} loket lagi supaya tunggu di bawah 15 menit. Saat ini butuh {queue.countersNeeded}{' '}
            loket untuk {queue.waiting} orang.
          </Notice>
        ) : (
          <Notice tone="ok">Antrean terkendali, perkiraan tunggu di bawah 15 menit.</Notice>
        )}
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-0.5">
          <span className="text-sm font-medium">Koreksi manual</span>
          <span className="text-xs text-muted">{event.serviceSeconds} detik per orang</span>
        </div>
        <Stepper
          value={waitingCount}
          min={0}
          onChange={onWaitingChange}
          decreaseLabel="Kurangi antrean"
          increaseLabel="Tambah antrean"
        />
      </div>
    </Card>
  )
}
