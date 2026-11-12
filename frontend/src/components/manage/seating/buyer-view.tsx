import { useMemo } from 'react'
import { SeatLegend } from '@/components/seat-map/seat-legend'
import { SeatMapView } from '@/components/seat-map/seat-map-view'
import type { SeatMapBlock, SeatMapSeat } from '@/types/catalog'
import { isLocked } from './seat-geometry'
import type { MapState } from './use-seat-map'

const NONE: string[] = []

// Tampilan baca saja memakai komponen denah pembeli, jadi penyelenggara di
// layar sempit melihat persis apa yang dilihat pembeli. held dan sold
// disatukan jadi taken, sama seperti denah publik.
export function BuyerView({ map }: { map: MapState }) {
  const seats = useMemo<SeatMapSeat[]>(
    () =>
      Object.values(map.seatsByBlock)
        .flat()
        .map((seat) => ({ ...seat, status: isLocked(seat.status) ? 'taken' : seat.status === 'disabled' ? 'disabled' : 'available' })),
    [map.seatsByBlock],
  )
  const blocks = useMemo<SeatMapBlock[]>(
    () =>
      map.blocks.map((block) => ({
        id: block.id,
        code: block.code,
        name: block.name,
        categoryId: block.categoryId,
        categoryName: block.categoryName,
      })),
    [map.blocks],
  )

  return (
    <div className="grid gap-3">
      <SeatLegend showDisabled />
      <SeatMapView layout={map.layout} seats={seats} blocks={blocks} selected={NONE} />
    </div>
  )
}
