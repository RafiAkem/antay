import { cn } from '@/components/ui/cn'
import { SeatGlyph } from './seat-glyph'
import type { SeatVisual } from './seat-map-geometry'

type SeatLegendProps = {
  // Tampilkan contoh kursi pudar, untuk denah yang menyorot satu kategori.
  showDimmed?: boolean
  showDisabled?: boolean
  className?: string
}

type Item = { key: string; text: string; visual: SeatVisual; dimmed?: boolean }

export function SeatLegend({ showDimmed = false, showDisabled = false, className }: SeatLegendProps) {
  const items: Item[] = [
    { key: 'available', text: 'Tersedia', visual: 'available' },
    { key: 'selected', text: 'Pilihanmu', visual: 'selected' },
    { key: 'taken', text: 'Sudah terisi', visual: 'taken' },
  ]
  if (showDimmed) items.push({ key: 'dimmed', text: 'Kategori lain', visual: 'available', dimmed: true })
  if (showDisabled) items.push({ key: 'disabled', text: 'Tidak dipakai', visual: 'disabled' })

  return (
    <ul aria-label="Keterangan denah" className={cn('flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted', className)}>
      {items.map((item) => (
        <li key={item.key} className="inline-flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="-12 -12 24 24" aria-hidden="true" className="flex-none">
            <SeatGlyph visual={item.visual} dimmed={item.dimmed} />
          </svg>
          {item.text}
        </li>
      ))}
    </ul>
  )
}
