import { Select } from '@/components/ui/select'
import type { EventDetail } from '@/types/api'
import { Stepper } from './stepper'

export function CounterBar({
  events,
  event,
  counter,
  busy,
  onEventChange,
  onCounterChange,
  onCountersChange,
}: {
  events: EventDetail[]
  event: EventDetail | null
  counter: number
  busy: boolean
  onEventChange: (eventId: string) => void
  onCounterChange: (counter: number) => void
  onCountersChange: (count: number) => void
}) {
  const eventOptions = events.map((item) => ({ value: item.id, label: item.name }))
  const counterOptions = event
    ? Array.from({ length: event.counterCount }, (_, index) => ({
        value: String(index + 1),
        label: `Loket ${index + 1}`,
      }))
    : []

  // Di ponsel event makan satu baris penuh, lalu loket dan stepper berbagi
  // baris kedua. Di layar lebar ketiganya sejajar.
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 rounded-card border border-border-soft bg-surface p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
      <Select
        label="Event"
        value={event?.id ?? ''}
        options={eventOptions}
        onChange={onEventChange}
        placeholder="Belum ada event"
        className="col-span-2 sm:col-span-1"
      />
      <Select
        label="Loket saya"
        value={event ? String(counter) : ''}
        options={counterOptions}
        onChange={(value) => onCounterChange(Number(value))}
        placeholder="Pilih loket"
        disabled={!event}
      />
      <div className="grid gap-1.5">
        <span className="text-[13px] font-semibold">Loket buka</span>
        <Stepper
          value={event?.counterCount ?? 0}
          min={1}
          max={20}
          disabled={!event}
          busy={busy}
          onChange={onCountersChange}
          decreaseLabel="Kurangi loket"
          increaseLabel="Tambah loket"
          compact
        />
      </div>
    </div>
  )
}
