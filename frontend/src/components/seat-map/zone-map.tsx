import { useCallback, useMemo } from 'react'
import { cn } from '@/components/ui/cn'
import { formatRupiah } from '@/components/ui/format-rupiah'
import type { CatalogCategory, SeatMap, SeatMapSeat } from '@/types/catalog'
import { SeatMapView } from './seat-map-view'
import { zoneColors } from './seat-zones'

type ZoneMapProps = {
  map: SeatMap
  // Sudah diurutkan pemanggil (termurah dulu); urutan ini juga menentukan warna.
  categories: CatalogCategory[]
  selectedCategoryId?: string | null
  // Tanpa onPickSeat denah cuma untuk dilihat.
  onPickSeat?: (categoryId: string, seatCode: string) => void
  onPickCategory?: (categoryId: string) => void
  className?: string
}

const NO_SELECTION: string[] = []

// Denah yang memetakan semua kategori sekaligus: tiap kategori berkursi punya
// warnanya sendiri, jadi pembeli langsung tahu VIP A itu di mana sebelum
// memilih paket. Mengetuk kursi memilih kategori sekaligus kursinya.
export function ZoneMap({ map, categories, selectedCategoryId, onPickSeat, onPickCategory, className }: ZoneMapProps) {
  const tones = useMemo(() => zoneColors(categories), [categories])
  const seated = useMemo(() => categories.filter((category) => category.isSeated), [categories])
  const standing = useMemo(() => categories.filter((category) => !category.isSeated), [categories])
  const open = useMemo(() => new Set(seated.filter((category) => !category.soldOut).map((category) => category.id)), [seated])
  const byLabel = useMemo(() => new Map(map.seats.map((seat) => [seat.label, seat])), [map.seats])

  const selectable = useCallback((seat: SeatMapSeat) => seat.status === 'available' && open.has(seat.categoryId), [open])
  const onToggle = onPickSeat
    ? (label: string) => {
        const seat = byLabel.get(label)
        if (seat) onPickSeat(seat.categoryId, label)
      }
    : undefined

  return (
    <div className={cn('grid gap-3', className)}>
      <ul aria-label="Kategori di denah" className="flex flex-wrap gap-2">
        {seated.map((category) => {
          const active = category.id === selectedCategoryId
          const body = (
            <>
              <span aria-hidden="true" className="size-3 flex-none rounded-pill" style={{ background: tones[category.id] }} />
              <span className="font-semibold text-ink">{category.name}</span>
              <span className="text-muted">
                {category.soldOut ? 'Habis' : category.priceFrom !== null ? `mulai ${formatRupiah(category.priceFrom)}` : `sisa ${category.left}`}
              </span>
            </>
          )
          const chip = cn(
            'inline-flex min-h-10 items-center gap-2 rounded-pill border px-3 text-[13px]',
            active ? 'border-accent bg-tint-50' : 'border-border-soft bg-surface',
          )
          return (
            <li key={category.id}>
              {onPickCategory && !category.soldOut ? (
                <button type="button" aria-pressed={active} onClick={() => onPickCategory(category.id)} className={cn(chip, 'hover:border-control')}>
                  {body}
                </button>
              ) : (
                <span className={chip}>{body}</span>
              )}
            </li>
          )
        })}
      </ul>

      <SeatMapView
        layout={map.layout}
        seats={map.seats}
        blocks={map.blocks}
        selected={NO_SELECTION}
        selectable={onPickSeat ? selectable : undefined}
        onToggle={onToggle}
        tones={tones}
        className="max-h-[520px]"
      />

      <p className="text-[13px] text-muted">
        {onPickSeat ? 'Ketuk kursi berwarna untuk langsung memilihnya. Kursi abu-abu bersilang sudah terisi.' : 'Kursi abu-abu bersilang sudah terisi.'}
        {standing.length > 0 ? ` ${standing.map((category) => category.name).join(', ')} tanpa nomor kursi, pilih dari daftar.` : ''}
      </p>
    </div>
  )
}
