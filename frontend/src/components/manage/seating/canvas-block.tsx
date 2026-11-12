import { memo, useMemo, type KeyboardEvent } from 'react'
import { cn } from '@/components/ui/cn'
import type { SeatBlock } from '@/types/seating'
import { BlockSeats } from './block-seats'
import { localBounds, type SeatDot } from './seat-geometry'

type Props = {
  block: SeatBlock
  seats: readonly SeatDot[]
  rotation: number
  selected: boolean
  locked: boolean
  interactive: boolean
  offset: { dx: number; dy: number } | null
  rotationDelta: number
  onSelect: (id: string) => void
  onNudge: (id: string, dx: number, dy: number) => void
}

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
}

// Bingkai digambar dalam koordinat sebelum diputar lalu diputar di titik
// poros blok, jadi bentuknya selalu pas dengan kursi berapa pun sudutnya.
export const CanvasBlock = memo(function CanvasBlock(props: Props) {
  const { block, seats, rotation, selected, locked, interactive, offset, rotationDelta, onSelect, onNudge } = props
  const box = useMemo(() => localBounds(seats, { x: block.x, y: block.y }, rotation), [seats, block.x, block.y, rotation])
  const move = offset ? `translate(${offset.dx} ${offset.dy}) ` : ''
  const pivot = `${block.x} ${block.y}`
  const centerX = (box.minX + box.maxX) / 2
  const handleY = box.maxY + 26

  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(block.id)
      return
    }
    const arrow = ARROWS[event.key]
    if (!arrow || locked) return
    event.preventDefault()
    const step = event.shiftKey ? 50 : 10
    onSelect(block.id)
    onNudge(block.id, arrow[0] * step, arrow[1] * step)
  }

  const label = `${block.name}, kode ${block.code}, ${block.categoryName}, ${seats.length} kursi${
    locked ? ', bentuk terkunci karena ada kursi terjual atau ditahan' : ''
  }. Enter untuk memilih, panah untuk menggeser.`

  return (
    <g
      data-block={block.id}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'button' : undefined}
      aria-label={interactive ? label : undefined}
      aria-pressed={interactive ? selected : undefined}
      onKeyDown={interactive ? onKeyDown : undefined}
      className={cn('group outline-none', interactive && (locked ? 'cursor-pointer' : 'cursor-move'))}
    >
      <g transform={`${move}rotate(${rotation + rotationDelta} ${pivot})`}>
        <rect
          x={box.minX}
          y={box.minY}
          width={box.maxX - box.minX}
          height={box.maxY - box.minY}
          rx={6}
          fill="transparent"
          pointerEvents={interactive ? 'all' : 'none'}
          className={cn(
            selected ? 'stroke-accent' : 'stroke-control group-focus-visible:stroke-accent',
            !interactive && !selected && 'stroke-transparent',
          )}
          strokeWidth={selected ? 2 : 1}
          strokeDasharray={selected ? undefined : '4 4'}
          vectorEffect="non-scaling-stroke"
        />
        <text x={box.minX + 2} y={box.minY - 7} fontSize={12} fontWeight={600} className="fill-ink">
          {block.name} · {block.code}
          {locked ? ' (terkunci)' : ''}
        </text>
        {selected && interactive && !locked ? (
          <g data-handle="rotate" className="cursor-grab">
            <line
              x1={centerX}
              y1={box.maxY}
              x2={centerX}
              y2={handleY - 7}
              className="stroke-accent"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={centerX} cy={handleY} r={7} className="fill-surface stroke-accent" strokeWidth={2}>
              <title>Seret untuk memutar blok. Tahan Shift untuk kelipatan 15 derajat.</title>
            </circle>
          </g>
        ) : null}
      </g>
      <g transform={`${move}rotate(${rotationDelta} ${pivot})`}>
        <BlockSeats seats={seats} highlight={selected} />
      </g>
    </g>
  )
})
