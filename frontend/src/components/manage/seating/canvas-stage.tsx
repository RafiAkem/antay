import type { KeyboardEvent } from 'react'
import { cn } from '@/components/ui/cn'
import type { SeatStage } from '@/types/seating'

type Props = {
  stage: SeatStage
  selected: boolean
  interactive: boolean
  onSelect: () => void
}

const HANDLE = 10

export function CanvasStage({ stage, selected, interactive, onSelect }: Props) {
  const { x, y, width, height } = stage
  const corners = [
    { id: 'nw', cx: x, cy: y, cursor: 'cursor-nwse-resize' },
    { id: 'ne', cx: x + width, cy: y, cursor: 'cursor-nesw-resize' },
    { id: 'sw', cx: x, cy: y + height, cursor: 'cursor-nesw-resize' },
    { id: 'se', cx: x + width, cy: y + height, cursor: 'cursor-nwse-resize' },
  ]

  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelect()
  }

  return (
    <g
      data-stage=""
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'button' : undefined}
      aria-label={interactive ? `Panggung ${stage.label}. Enter untuk mengubah label dan ukurannya.` : undefined}
      aria-pressed={interactive ? selected : undefined}
      onKeyDown={interactive ? onKeyDown : undefined}
      className={cn('group outline-none', interactive && 'cursor-move')}
    >
      <rect x={x} y={y} width={width} height={height} rx={4} className="fill-tint-100" />
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={Math.min(16, Math.max(9, height * 0.4))}
        fontWeight={600}
        className="fill-accent-ink"
      >
        {stage.label}
      </text>
      <rect
        x={x - 3}
        y={y - 3}
        width={width + 6}
        height={height + 6}
        rx={6}
        fill="none"
        pointerEvents="none"
        className={selected ? 'stroke-accent' : 'stroke-transparent group-focus-visible:stroke-accent'}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      {selected && interactive
        ? corners.map((corner) => (
            <rect
              key={corner.id}
              data-handle={`stage-${corner.id}`}
              x={corner.cx - HANDLE / 2}
              y={corner.cy - HANDLE / 2}
              width={HANDLE}
              height={HANDLE}
              rx={2}
              className={cn('fill-surface stroke-accent', corner.cursor)}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            >
              <title>Seret untuk mengubah ukuran panggung</title>
            </rect>
          ))
        : null}
    </g>
  )
}
