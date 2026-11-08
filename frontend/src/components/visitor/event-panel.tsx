import type { EventDetail } from '@/types/api'
import { Card, CardHead } from '@/components/ui/card'
import { EventList } from '@/components/visitor/event-list'
import { SlotGrid } from '@/components/visitor/slot-grid'

type Props = {
  events: EventDetail[]
  event: EventDetail | null
  selectedId: string | null
  selectedSlot: string | null
  quietStart: string | null
  slotError: string | null
  onPickEvent: (id: string) => void
  onPickSlot: (start: string) => void
}

export function EventPanel({
  events,
  event,
  selectedId,
  selectedSlot,
  quietStart,
  slotError,
  onPickEvent,
  onPickSlot,
}: Props) {
  return (
    <div className="grid content-start gap-4">
      <Card>
        <CardHead title="Event dengan penukaran di loket" meta="hari ini" />
        <EventList events={events} selectedId={selectedId} onSelect={onPickEvent} />
      </Card>
      {event ? (
        <Card>
          <CardHead title="Jam datang" meta={`${event.slotMinutes} menit · kuota ${event.slotCapacity}`} />
          <SlotGrid
            slots={event.slots}
            selected={selectedSlot}
            quietStart={quietStart}
            invalid={Boolean(slotError)}
            onSelect={onPickSlot}
          />
          {slotError ? <p className="mt-2 text-[13px] text-negative">{slotError}</p> : null}
          <p className="mt-3 text-xs leading-[18px] text-muted">
            Label "sepi" menandai slot terlonggar di antara empat slot berikutnya.
          </p>
        </Card>
      ) : null}
    </div>
  )
}
