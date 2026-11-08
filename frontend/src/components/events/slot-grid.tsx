import type { Slot } from '@/types/api'
import { percent } from '@/lib/format'

type Props = {
  slots: Slot[]
  selected: string | null
  quietStart: string | null
  invalid?: boolean
  onSelect: (start: string) => void
}

export function SlotGrid({ slots, selected, quietStart, invalid, onSelect }: Props) {
  return (
    <div role="group" aria-label="Pilih jam datang" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {slots.map((slot) => {
        const disabled = slot.past || slot.left === 0
        const isSelected = slot.start === selected
        return (
          <button
            key={slot.start}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            onClick={() => onSelect(slot.start)}
            className={`relative grid gap-0.5 rounded-[var(--radius-control)] border p-2.5 text-left transition-colors ${
              disabled
                ? 'border-border-soft bg-raised'
                : isSelected
                  ? 'bg-tint-50'
                  : 'border-border-soft bg-surface hover:border-control'
            } ${isSelected ? (invalid ? 'border-negative' : 'border-accent') : ''}`}
          >
            {slot.start === quietStart && !disabled ? (
              <span className="absolute top-2 right-2 rounded-full bg-tint-100 px-1.5 text-[11px] leading-[18px] font-semibold text-accent-ink">
                sepi
              </span>
            ) : null}
            <span className={`num text-base font-semibold ${disabled ? 'text-faint line-through' : ''}`}>
              {slot.start}
            </span>
            <span className="num text-xs text-muted">
              {slot.past ? 'lewat' : slot.left > 0 ? `sisa ${slot.left}` : 'penuh'}
            </span>
            {!slot.past ? (
              <span className="mt-1.5 h-1 overflow-hidden rounded-full bg-tint-100">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${percent(slot.booked, slot.capacity)}%` }}
                />
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
