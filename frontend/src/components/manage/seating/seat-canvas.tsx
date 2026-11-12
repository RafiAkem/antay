import { useCallback, useId, useRef } from 'react'
import { cn } from '@/components/ui/cn'
import type { SeatLayout } from '@/types/seating'
import { CanvasBlock } from './canvas-block'
import { CanvasStage } from './canvas-stage'
import { boxFrom } from './seat-geometry'
import type { EditorMode, Selection } from './seating-labels'
import { useCanvasPointer, type CanvasBlockInput, type CanvasCallbacks } from './use-canvas-pointer'
import { useViewport } from './use-viewport'
import { ZoomControls } from './zoom-controls'

type Props = CanvasCallbacks & {
  layout: SeatLayout
  blocks: CanvasBlockInput[]
  mode: EditorMode
  readOnly: boolean
  selection: Selection
  lockedIds: ReadonlySet<string>
  onNudgeBlock: (id: string, dx: number, dy: number) => void
  hint: string
}

const GRID = 20

export function SeatCanvas(props: Props) {
  const { layout, blocks, mode, readOnly, selection, lockedIds, onSelect, onNudgeBlock, hint } = props
  const svgRef = useRef<SVGSVGElement>(null)
  const gridId = `seat-grid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const viewport = useViewport(layout.canvasWidth, layout.canvasHeight)
  const pointer = useCanvasPointer({
    ...props,
    svgRef,
    viewport,
    stage: layout.stage,
    canvas: { width: layout.canvasWidth, height: layout.canvasHeight },
  })
  const { drag } = pointer
  const interactive = !readOnly && mode === 'layout'
  const { box } = viewport

  const selectBlock = useCallback((id: string) => onSelect({ kind: 'block', id }), [onSelect])
  const selectStage = useCallback(() => onSelect({ kind: 'stage' }), [onSelect])

  const stage = drag?.kind === 'stage' ? drag.rect : layout.stage
  const marquee = drag?.kind === 'marquee' ? boxFrom(drag.start, drag.end) : null

  return (
    <div className="relative h-full overflow-hidden rounded-card border border-border-soft bg-raised">
      <svg
        ref={svgRef}
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        role="group"
        aria-label={`Kanvas denah ${layout.canvasWidth} kali ${layout.canvasHeight}`}
        onPointerDown={pointer.onPointerDown}
        onPointerMove={pointer.onPointerMove}
        onPointerUp={pointer.onPointerUp}
        onPointerCancel={pointer.onPointerCancel}
        className={cn(
          'block h-full w-full touch-none select-none',
          drag?.kind === 'pan' ? 'cursor-grabbing' : readOnly ? 'cursor-grab' : mode === 'seats' && 'cursor-crosshair',
        )}
      >
        <defs>
          <pattern id={gridId} width={GRID} height={GRID} patternUnits="userSpaceOnUse">
            <circle cx={1} cy={1} r={1} className="fill-control" />
          </pattern>
        </defs>
        <rect
          x={0}
          y={0}
          width={layout.canvasWidth}
          height={layout.canvasHeight}
          className="fill-surface stroke-border-soft"
          vectorEffect="non-scaling-stroke"
        />
        <rect x={0} y={0} width={layout.canvasWidth} height={layout.canvasHeight} fill={`url(#${gridId})`} pointerEvents="none" />
        <CanvasStage
          stage={stage}
          selected={selection?.kind === 'stage'}
          interactive={interactive}
          onSelect={selectStage}
        />
        {blocks.map(({ block, seats, rotation }) => (
          <CanvasBlock
            key={block.id}
            block={block}
            seats={seats}
            rotation={rotation}
            selected={selection?.kind === 'block' && selection.id === block.id}
            locked={lockedIds.has(block.id)}
            interactive={interactive}
            offset={drag?.kind === 'block' && drag.id === block.id ? drag : null}
            rotationDelta={drag?.kind === 'rotate' && drag.id === block.id ? drag.delta : 0}
            onSelect={selectBlock}
            onNudge={onNudgeBlock}
          />
        ))}
        {marquee ? (
          <rect
            x={marquee.minX}
            y={marquee.minY}
            width={marquee.maxX - marquee.minX}
            height={marquee.maxY - marquee.minY}
            className="fill-accent/10 stroke-accent"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        ) : null}
      </svg>
      <p className="pointer-events-none absolute top-3 left-3 max-w-[min(420px,70%)] rounded-control border border-border-soft bg-surface px-2.5 py-1.5 text-xs leading-[18px] text-muted">
        {hint}
      </p>
      <ZoomControls viewport={viewport} />
    </div>
  )
}
