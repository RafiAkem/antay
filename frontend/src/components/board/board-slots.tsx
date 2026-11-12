import { cn } from '@/components/ui/cn'
import type { Slot } from '@/types/api'

// Empat slot berikutnya. Slot penuh tetap ditampilkan, diredupkan, supaya
// pengunjung yang belum punya tiket tahu jam itu sudah tidak bisa dipilih.
export function BoardSlots({ slots }: { slots: Slot[] }) {
  if (slots.length === 0) return null

  return (
    <ul className="grid grid-cols-2 gap-[clamp(8px,1.2vw,20px)] lg:grid-cols-4" aria-label="Slot berikutnya">
      {slots.slice(0, 4).map((slot) => {
        const full = slot.left <= 0
        return (
          <li
            key={slot.start}
            className={cn(
              'grid gap-1 rounded-control border border-board-line px-[clamp(14px,1.6vw,28px)] py-[clamp(12px,1.4vw,24px)]',
              full && 'opacity-55',
            )}
          >
            <b className="num font-mono text-[clamp(26px,3.2vw,52px)] leading-none font-semibold">{slot.start}</b>
            <span className="num text-[clamp(14px,1.4vw,22px)] text-board-dim">
              {full ? 'penuh' : `sisa ${slot.left} dari ${slot.capacity}`}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
