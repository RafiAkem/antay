import { useCallback } from 'react'
import { SeatLegend } from '@/components/seat-map/seat-legend'
import { SeatMapView } from '@/components/seat-map/seat-map-view'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/pill'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import type { CatalogCategory, SeatMap, SeatMapSeat } from '@/types/catalog'
import { SeatChips } from './seat-chips'
import { useSeatMap } from './use-seat-map'

type SeatStepProps = {
  eventId: string
  category: CatalogCategory
  seatCodes: string[]
  totalPax: number
  onToggle: (seatCode: string) => void
  onSetSeats: (seatCodes: string[]) => void
}

export function SeatStep({ eventId, category, seatCodes, totalPax, onToggle, onSetSeats }: SeatStepProps) {
  const toast = useToast()

  // Pilihan kursi cuma tersimpan di perangkat. Setiap denah dimuat ulang,
  // kursi yang sudah diambil orang lain dilepas dan pembeli diberi tahu.
  const onLoaded = useCallback(
    (map: SeatMap) => {
      const open = new Set(map.seats.filter((seat) => seat.categoryId === category.id && seat.status === 'available').map((seat) => seat.label))
      const gone = seatCodes.filter((code) => !open.has(code))
      if (gone.length === 0) return
      onSetSeats(seatCodes.filter((code) => open.has(code)))
      toast.show(`Kursi ${gone.join(', ')} sudah diambil pembeli lain. Pilih kursi pengganti.`, 'info')
    },
    [category.id, seatCodes, onSetSeats, toast],
  )
  const { map, error, loading, reload } = useSeatMap(eventId, onLoaded)

  const selectable = useCallback((seat: SeatMapSeat) => seat.categoryId === category.id && seat.status === 'available', [category.id])
  const remaining = Math.max(0, totalPax - seatCodes.length)

  const toggle = (label: string) => {
    if (!seatCodes.includes(label) && remaining === 0) {
      toast.show(`Semua ${totalPax} kursi sudah dipilih. Lepas salah satu dulu kalau mau pindah.`, 'info')
      return
    }
    onToggle(label)
  }

  const categorySeats = map?.seats.filter((seat) => seat.categoryId === category.id) ?? []

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className={remaining > 0 ? 'font-semibold text-accent-ink' : 'font-semibold text-positive'}>
          {remaining > 0 ? `Pilih ${remaining} kursi lagi` : 'Semua kursi sudah dipilih'}
          <span className="font-normal text-muted"> · kategori {category.name}</span>
        </p>
        <Button variant="ghost" size="small" onClick={reload} disabled={loading}>
          {loading && map ? 'Memuat ulang' : 'Muat ulang denah'}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="rounded-control bg-negative-bg px-3 py-2 text-[13px] text-negative-ink">
          {error}
        </p>
      ) : null}

      {map ? (
        categorySeats.length === 0 ? (
          <Empty
            title={`Denah untuk ${category.name} belum tersedia.`}
            hint="Penyelenggara belum memasang kursi untuk kategori ini. Pilih kategori lain atau coba lagi nanti."
          />
        ) : (
          <>
            <SeatLegend showDimmed />
            <SeatMapView
              layout={map.layout}
              seats={map.seats}
              blocks={map.blocks}
              selectable={selectable}
              selected={seatCodes}
              onToggle={toggle}
              highlightCategoryId={category.id}
              className="max-h-[560px]"
            />
          </>
        )
      ) : loading ? (
        <Skeleton className="aspect-[4/3] w-full rounded-card" />
      ) : null}

      <SeatChips seatCodes={seatCodes} onRemove={onToggle} />
    </div>
  )
}
