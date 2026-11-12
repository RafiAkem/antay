import type { Slot } from '@/types/api'
import { cn } from '@/components/ui/cn'
import { percent } from '@/lib/format'
import { clockLabel } from './detail/event-format'

type Props = {
  slots: Slot[]
  selected?: string | null
  quietStart?: string | null
  invalid?: boolean
  // Tanpa onSelect, grid hanya menampilkan sisa kuota (halaman event).
  // Dengan onSelect, tiap slot jadi tombol untuk memilih jam tukar.
  onSelect?: (start: string) => void
}

function SlotBody({ slot, quiet }: { slot: Slot; quiet: boolean }) {
  const closed = slot.past || slot.left === 0
  const fill = percent(slot.booked, slot.capacity)
  return (
    <>
      <span className="flex items-center justify-between gap-1">
        <span className={cn('num text-[15px] leading-[22px] font-bold', closed && 'text-muted line-through')}>
          {clockLabel(slot.start)}
        </span>
        {slot.current ? (
          <span className="rounded-tag bg-tint-100 px-1 text-[11px] leading-4 font-bold text-accent-ink">sekarang</span>
        ) : quiet && !closed ? (
          <span className="rounded-tag bg-positive-bg px-1 text-[11px] leading-4 font-bold text-positive-ink">sepi</span>
        ) : null}
      </span>
      <span className={cn('num text-xs', !closed && slot.left < slot.capacity * 0.2 ? 'text-scarce' : 'text-muted')}>
        {slot.past ? 'lewat' : slot.left > 0 ? `sisa ${slot.left}` : 'penuh'}
      </span>
      {!slot.past ? (
        <span aria-hidden="true" className="mt-1 h-1 overflow-hidden rounded-pill bg-tint-100">
          <span className={cn('block h-full rounded-pill', closed ? 'bg-control' : 'bg-accent')} style={{ width: `${fill}%` }} />
        </span>
      ) : null}
    </>
  )
}

export function SlotGrid({ slots, selected = null, quietStart = null, invalid, onSelect }: Props) {
  const grid = 'grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5'
  const tile = 'grid gap-0.5 rounded-control border p-2.5 text-left'

  if (!onSelect) {
    return (
      <ul aria-label="Sisa kuota per slot tukar" className={grid}>
        {slots.map((slot) => (
          <li
            key={slot.start}
            className={cn(tile, slot.past || slot.left === 0 ? 'border-border-soft bg-raised' : 'border-border-soft bg-surface')}
          >
            <span className="sr-only">
              {clockLabel(slot.start)} sampai {clockLabel(slot.end)}:
            </span>
            <SlotBody slot={slot} quiet={slot.start === quietStart} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div role="group" aria-label="Pilih jam tukar" className={grid}>
      {slots.map((slot) => {
        const disabled = slot.past || slot.left === 0
        const isSelected = slot.start === selected
        return (
          <button
            key={slot.start}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            aria-label={`${clockLabel(slot.start)} sampai ${clockLabel(slot.end)}, ${
              slot.past ? 'sudah lewat' : slot.left > 0 ? `sisa ${slot.left}` : 'penuh'
            }`}
            onClick={() => onSelect(slot.start)}
            className={cn(
              tile,
              'transition-colors',
              disabled && 'border-border-soft bg-raised',
              !disabled && !isSelected && 'border-border-soft bg-surface hover:border-control',
              isSelected && (invalid ? 'border-negative bg-tint-50' : 'border-accent bg-tint-50'),
            )}
          >
            <SlotBody slot={slot} quiet={slot.start === quietStart} />
          </button>
        )
      })}
    </div>
  )
}
