import { useMemo, type FocusEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { cn } from '@/components/ui/cn'
import type { SeatMapBlock, SeatMapLayout, SeatMapSeat } from '@/types/catalog'
import { SeatLayer } from './seat-layer'
import { blockLabels, fitSeats, viewBox } from './seat-map-geometry'
import { SeatMapControls } from './seat-map-controls'
import { useSeatMapViewport } from './use-seat-map-viewport'

export type SeatMapViewProps = {
  layout: SeatMapLayout
  seats: SeatMapSeat[]
  blocks?: SeatMapBlock[]
  // Kursi mana yang boleh diklik. Kursi terpilih selalu bisa dilepas.
  selectable?: (seat: SeatMapSeat) => boolean
  // Label kursi yang terpilih, misalnya ["C12", "C13"].
  selected: string[]
  // Tanpa onToggle denah hanya untuk dilihat: tidak ada kursi yang bisa difokus.
  onToggle?: (label: string) => void
  // Kursi di luar kategori ini dipudarkan, dan tampilan awal menyorot kategori ini.
  highlightCategoryId?: string
  // Warna kursi tersedia per kategori, untuk denah yang memetakan semua kategori.
  tones?: Record<string, string>
  className?: string
}

function seatElement(target: EventTarget | null): Element | null {
  return target instanceof Element ? target.closest('[data-seat]') : null
}

// Denah kursi baca-saja yang dipakai bersama: checkout pembeli memakainya untuk
// memilih, editor denah penyelenggara untuk pratinjau. Tidak menyimpan state per
// kursi; geser dan zoom cuma mengubah viewBox, jadi 3.000 kursi tetap ringan.
export function SeatMapView({ layout, seats, blocks = [], selectable, selected, onToggle, highlightCategoryId, tones, className }: SeatMapViewProps) {
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const labels = useMemo(() => blockLabels(blocks, seats), [blocks, seats])
  const initialView = useMemo(
    () => fitSeats(layout, highlightCategoryId ? seats.filter((seat) => seat.categoryId === highlightCategoryId) : seats),
    [layout, seats, highlightCategoryId],
  )
  const { svgRef, view, ...viewport } = useSeatMapViewport(layout, initialView)
  const { stage } = layout

  const onClick = (event: MouseEvent<SVGSVGElement>) => {
    if (!onToggle || viewport.wasDragged()) return
    const label = seatElement(event.target)?.getAttribute('data-seat')
    if (!label) return
    if (viewport.zoomIfTooSmall({ x: event.clientX, y: event.clientY })) return
    onToggle(label)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const label = seatElement(event.target)?.getAttribute('data-seat')
    if (label && onToggle && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      onToggle(label)
      return
    }
    viewport.onKeyDown(event)
  }

  const onFocus = (event: FocusEvent<SVGSVGElement>) => {
    const element = seatElement(event.target)
    if (element) viewport.revealElement(element)
  }

  return (
    <div
      onKeyDown={onKeyDown}
      className={cn('relative min-h-[260px] w-full overflow-hidden rounded-card border border-border-soft bg-surface', className)}
      style={{ aspectRatio: `${layout.canvasWidth} / ${layout.canvasHeight}` }}
    >
      <svg
        ref={svgRef}
        viewBox={viewBox(view, layout)}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Denah kursi. Tombol panah menggeser denah, plus dan minus memperbesar atau memperkecil."
        tabIndex={0}
        onClick={onClick}
        onFocus={onFocus}
        {...viewport.handlers}
        className="absolute inset-0 block h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
      >
        {stage.width > 0 && stage.height > 0 ? (
          <g aria-hidden="true">
            <rect x={stage.x} y={stage.y} width={stage.width} height={stage.height} rx={6} className="fill-tint-100" />
            <text
              x={stage.x + stage.width / 2}
              y={stage.y + stage.height / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={Math.min(18, stage.height * 0.45)}
              fontWeight={700}
              className="fill-accent-ink"
            >
              {stage.label || 'Panggung'}
            </text>
          </g>
        ) : null}
        <g aria-hidden="true">
          {labels.map((label) => (
            <text
              key={label.id}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              className={!highlightCategoryId || label.categoryId === highlightCategoryId ? 'fill-ink' : 'fill-faint'}
            >
              {label.text}
            </text>
          ))}
        </g>
        <SeatLayer
          seats={seats}
          selected={selectedSet}
          selectable={selectable}
          highlightCategoryId={highlightCategoryId}
          interactive={onToggle !== undefined}
          tones={tones}
        />
      </svg>
      <SeatMapControls
        zoomed={view.scale > 1.01}
        onZoomIn={viewport.zoomIn}
        onZoomOut={viewport.zoomOut}
        onReset={viewport.reset}
      />
    </div>
  )
}
