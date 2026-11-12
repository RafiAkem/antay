import { cn } from '@/components/ui/cn'

type Props = {
  name: string
  dateLabel: string
  place: string
  className?: string
}

// Poster belum diunggah penyelenggara. Daripada kotak abu-abu, tampilkan
// seperti ticket stub malam: nama besar, tanggal, dan garis sobek di bawah.
export function PosterPlaceholder({ name, dateLabel, place, className }: Props) {
  return (
    <div
      role="img"
      aria-label={`${name}, ${dateLabel}. Poster belum tersedia.`}
      className={cn('relative flex aspect-square flex-col justify-between overflow-hidden bg-night p-6 text-board-ink', className)}
    >
      <span className="font-mono text-xs tracking-[0.12em] text-board-dim uppercase">Summarecon Mall Bandung</span>
      <div className="grid gap-3">
        <span className="line-clamp-4 text-[clamp(26px,7vw,40px)] leading-[1.05] font-bold tracking-[-0.02em] text-balance">
          {name}
        </span>
        <span className="text-[15px] leading-[22px] font-semibold text-board-dim">{dateLabel}</span>
      </div>
      <div className="grid gap-3">
        <div aria-hidden="true" className="relative -mx-6 border-t border-dashed border-board-line">
          <span className="absolute -top-2.5 -left-2.5 h-5 w-5 rounded-pill bg-ground" />
          <span className="absolute -top-2.5 -right-2.5 h-5 w-5 rounded-pill bg-ground" />
        </div>
        <span className="font-mono text-xs text-board-dim">{place}</span>
      </div>
    </div>
  )
}
