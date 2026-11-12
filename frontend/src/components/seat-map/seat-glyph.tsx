import { cn } from '@/components/ui/cn'
import { SEAT_RADIUS, type SeatVisual } from './seat-map-geometry'

type SeatGlyphProps = {
  visual: SeatVisual
  dimmed?: boolean
  // Warna area kategori (denah kategori). Cuma dipakai untuk kursi tersedia.
  tone?: string
}

// Gambar satu kursi di titik (0,0). Warna bukan satu-satunya pembeda (PRD 5.4):
// dipilih diberi centang, terisi diberi silang, tidak dipakai cuma titik kecil.
// Dipakai lapisan kursi dan legenda, jadi keduanya pasti sama.
export function SeatGlyph({ visual, dimmed = false, tone }: SeatGlyphProps) {
  if (visual === 'disabled') {
    return <circle r={3} className="fill-control" opacity={dimmed ? 0.5 : 1} />
  }
  if (visual === 'taken') {
    return (
      <g opacity={dimmed ? 0.4 : 1}>
        <circle r={SEAT_RADIUS} className="fill-border-soft" />
        <path d="M-4 -4L4 4M4 -4L-4 4" className="stroke-muted" strokeWidth={1.8} strokeLinecap="round" fill="none" />
      </g>
    )
  }
  if (visual === 'selected') {
    return (
      <g>
        <circle r={SEAT_RADIUS} className="fill-accent" />
        <path d="M-4.5 0.2L-1.3 3.4L4.6 -3.4" className="stroke-surface" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    )
  }
  if (tone && !dimmed) {
    return <circle r={SEAT_RADIUS - 1} strokeWidth={2} style={{ stroke: tone, fill: tone, fillOpacity: 0.18 }} />
  }
  return (
    <circle
      r={SEAT_RADIUS - 1}
      strokeWidth={2}
      className={cn('fill-surface', dimmed ? 'stroke-control' : 'stroke-accent')}
      opacity={dimmed ? 0.45 : 1}
    />
  )
}
