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

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        label="Event"
        value={event?.id ?? ''}
        options={eventOptions}
        onChange={onEventChange}
        placeholder="Belum ada event"
        className="min-w-[220px] flex-[2_1_260px]"
      />
      <Select
        label="Loket saya"
        value={event ? String(counter) : ''}
        options={counterOptions}
        onChange={(value) => onCounterChange(Number(value))}
        placeholder="Pilih loket"
        disabled={!event}
        className="min-w-[140px] flex-[1_1_160px]"
      />
      <div className="grid gap-2 text-sm font-medium">
        <span>Loket buka</span>
        <Stepper
          value={event?.counterCount ?? 0}
          min={1}
          max={20}
          disabled={!event}
          busy={busy}
          onChange={onCountersChange}
          decreaseLabel="Kurangi loket"
          increaseLabel="Tambah loket"
        />
      </div>
    </div>
  )
}
