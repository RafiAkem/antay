import { memo, useMemo } from 'react'
import type { SeatMapSeat } from '@/types/catalog'
import { SeatGlyph } from './seat-glyph'
import { SEAT_RADIUS, VISUAL_TEXT, type SeatVisual } from './seat-map-geometry'

type SeatNodeProps = {
  label: string
  x: number
  y: number
  visual: SeatVisual
  dimmed: boolean
  interactive: boolean
}

// Klik dan tombol keyboard tidak dipasang per kursi; SeatMapView menangkapnya
// sekali lewat data-seat, jadi kursi cukup berupa gambar dengan atribut.
function SeatNode({ label, x, y, visual, dimmed, interactive }: SeatNodeProps) {
  const transform = `translate(${x} ${y})`
  if (!interactive) {
    return (
      <g transform={transform} aria-hidden="true">
        <SeatGlyph visual={visual} dimmed={dimmed} />
      </g>
    )
  }
  return (
    <g
      transform={transform}
      role="button"
      tabIndex={0}
      aria-label={`Kursi ${label}, ${VISUAL_TEXT[visual]}`}
      aria-pressed={visual === 'selected'}
      data-seat={label}
      className="group cursor-pointer outline-none"
    >
      {/* Area sentuh sedikit lebih besar dari gambarnya; ikut membesar saat denah diperbesar. */}
      <circle r={SEAT_RADIUS + 4} className="fill-transparent" />
      <SeatGlyph visual={visual} dimmed={dimmed} />
      <circle
        r={SEAT_RADIUS + 3}
        fill="none"
        strokeWidth={2}
        className="stroke-accent opacity-0 group-hover:opacity-40 group-focus-visible:opacity-100"
      />
    </g>
  )
}

type GroupProps = {
  seats: SeatMapSeat[]
  // label terpilih di baris ini saja, digabung jadi string supaya memo bisa
  // membandingkannya dengan murah
  selectedKey: string
  selectable?: (seat: SeatMapSeat) => boolean
  highlightCategoryId?: string
  interactive: boolean
}

// Satu baris kursi per grup. Memilih satu kursi hanya merender ulang barisnya,
// bukan 3.000 kursi; di mode dev React selisihnya ratusan milidetik.
const SeatGroup = memo(function SeatGroup({ seats, selectedKey, selectable, highlightCategoryId, interactive }: GroupProps) {
  const selected = new Set(selectedKey ? selectedKey.split('\n') : [])
  return (
    <g>
      {seats.map((seat) => {
        const visual: SeatVisual = selected.has(seat.label) ? 'selected' : seat.status
        const canPick = interactive && (visual === 'selected' || (selectable ? selectable(seat) : false))
        const outside = highlightCategoryId !== undefined && seat.categoryId !== highlightCategoryId
        // Kursi kategori lain atau yang tidak bisa dipilih dibuat pudar, bukan
        // disembunyikan, supaya pembeli tetap melihat posisi dirinya di ruangan.
        const dimmed = visual !== 'selected' && (outside || (interactive && !canPick && visual === 'available'))
        return <SeatNode key={seat.id} label={seat.label} x={seat.x} y={seat.y} visual={visual} dimmed={dimmed} interactive={canPick} />
      })}
    </g>
  )
})

type SeatLayerProps = {
  seats: SeatMapSeat[]
  selected: Set<string>
  selectable?: (seat: SeatMapSeat) => boolean
  highlightCategoryId?: string
  interactive: boolean
}

export const SeatLayer = memo(function SeatLayer({ seats, selected, selectable, highlightCategoryId, interactive }: SeatLayerProps) {
  const groups = useMemo(() => {
    const byRow = new Map<string, SeatMapSeat[]>()
    for (const seat of seats) {
      const key = `${seat.blockId}\n${seat.row}`
      const list = byRow.get(key)
      if (list) list.push(seat)
      else byRow.set(key, [seat])
    }
    return [...byRow.entries()]
  }, [seats])

  return (
    <g>
      {groups.map(([key, rowSeats]) => (
        <SeatGroup
          key={key}
          seats={rowSeats}
          selectedKey={rowSeats.filter((seat) => selected.has(seat.label)).map((seat) => seat.label).join('\n')}
          selectable={selectable}
          highlightCategoryId={highlightCategoryId}
          interactive={interactive}
        />
      ))}
    </g>
  )
})
