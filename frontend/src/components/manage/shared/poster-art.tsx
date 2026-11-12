import { cn } from '@/components/ui/cn'
import { formatEventDate } from './manage-labels'

type PosterArtProps = {
  name: string
  eventDate: string
  posterUrl: string
  codePrefix?: string
  size: 'thumb' | 'card'
  className?: string
}

// Poster selalu persegi, sama seperti kartu event publik. Kalau belum ada poster,
// tampilkan nama dan tanggal di latar malam supaya daftar tetap terbaca, bukan kotak abu.
export function PosterArt({ name, eventDate, posterUrl, codePrefix, size, className }: PosterArtProps) {
  const box = cn(
    'relative aspect-square flex-none overflow-hidden bg-night',
    size === 'thumb' ? 'w-12 rounded-control' : 'w-full rounded-card',
    className,
  )

  if (posterUrl) {
    return (
      <div className={box}>
        <img
          src={posterUrl}
          alt=""
          width={size === 'thumb' ? 48 : 320}
          height={size === 'thumb' ? 48 : 320}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  if (size === 'thumb') {
    return (
      <div className={cn(box, 'grid place-items-center')} aria-hidden="true">
        <span className="font-mono text-[13px] font-semibold text-board-ink">{codePrefix || name.slice(0, 2)}</span>
      </div>
    )
  }

  return (
    <div className={cn(box, 'flex flex-col justify-end gap-1 p-3')} aria-hidden="true">
      <span className="line-clamp-3 text-[17px] leading-[1.15] font-bold tracking-[-0.01em] text-board-ink">
        {name || 'Event tanpa nama'}
      </span>
      <span className="text-xs font-semibold text-board-dim">{formatEventDate(eventDate)}</span>
    </div>
  )
}
