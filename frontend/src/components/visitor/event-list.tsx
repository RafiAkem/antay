import type { EventDetail } from '@/types/api'

type Props = {
  events: EventDetail[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function EventList({ events, selectedId, onSelect }: Props) {
  return (
    <div className="grid">
      {events.map((event) => {
        const selected = event.id === selectedId
        return (
          <button
            key={event.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(event.id)}
            className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 rounded-[var(--radius-control)] px-3 py-3 text-left transition-colors ${
              selected ? 'bg-tint-50' : 'hover:bg-raised'
            }`}
          >
            <span className="truncate text-[15px] font-semibold">{event.name}</span>
            <span className="row-span-2 text-right text-xs text-muted">
              <strong className="num block text-[15px] font-semibold text-ink">{event.leftTotal}</strong>
              sisa kuota
            </span>
            <span className="truncate text-[13px] text-muted">
              {event.place} · <span className="num">{event.openTime}-{event.closeTime}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
