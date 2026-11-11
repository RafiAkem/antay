import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import type { SeatBlock, SeatStage } from '@/types/seating'
import {
  angleOf,
  boxFrom,
  clampStage,
  inBox,
  normalizeAngle,
  resizeStage,
  toSvgPoint,
  type Point,
  type SeatDot,
  type StageHandle,
} from './seat-geometry'
import type { EditorMode, Selection } from './seating-labels'
import type { ViewBox, Viewport } from './use-viewport'

export type CanvasDrag =
  | { kind: 'pan'; box: ViewBox; clear: boolean }
  | { kind: 'block'; id: string; start: Point; dx: number; dy: number }
  | { kind: 'rotate'; id: string; origin: Point; startAngle: number; base: number; delta: number }
  | { kind: 'stage'; handle: StageHandle; start: Point; origin: SeatStage; rect: SeatStage }
  | { kind: 'marquee'; start: Point; end: Point; seat: string | null }

export type CanvasBlockInput = { block: SeatBlock; seats: readonly SeatDot[]; rotation: number }

export type CanvasCallbacks = {
  onSelect: (selection: Selection) => void
  onMoveBlock: (id: string, dx: number, dy: number) => void
  onRotateBlock: (id: string, rotation: number) => void
  onStageChange: (stage: SeatStage) => void
  onSeatsPicked: (labels: string[]) => void
}

type Options = CanvasCallbacks & {
  svgRef: RefObject<SVGSVGElement | null>
  viewport: Viewport
  readOnly: boolean
  mode: EditorMode
  selection: Selection
  stage: SeatStage
  canvas: { width: number; height: number }
  blocks: CanvasBlockInput[]
  lockedIds: ReadonlySet<string>
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
}

// Semua seret ditangani di elemen <svg> dengan pointer capture, jadi kursi dan
// blok tidak perlu punya handler sendiri-sendiri. Targetnya dibaca dari atribut data-*.
export function useCanvasPointer(options: Options) {
  const [drag, setDrag] = useState<CanvasDrag | null>(null)
  const dragRef = useRef<CanvasDrag | null>(null)
  const meta = useRef({ sx: 0, sy: 0, moved: false })
  const space = useRef(false)
  const { svgRef, viewport } = options
  const { zoomAt } = viewport

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || isTyping(event.target)) return
      space.current = true
      if (event.target === document.body) event.preventDefault()
    }
    const up = (event: KeyboardEvent) => {
      if (event.code === 'Space') space.current = false
    }
    const blur = () => (space.current = false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // React memasang wheel sebagai listener pasif, jadi preventDefault harus
  // lewat addEventListener sendiri supaya halaman tidak ikut tergulir.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      zoomAt(Math.exp(-event.deltaY * 0.0015), toSvgPoint(svg, event.clientX, event.clientY))
    }
    svg.addEventListener('wheel', wheel, { passive: false })
    return () => svg.removeEventListener('wheel', wheel)
  }, [svgRef, zoomAt])

  const set = (next: CanvasDrag | null) => {
    dragRef.current = next
    setDrag(next)
  }

  const start = (target: Element, point: Point, button: number): CanvasDrag | null => {
    const o = options
    const attr = (name: string) => target.closest(`[${name}]`)?.getAttribute(name) ?? null
    const pan = (clear: boolean): CanvasDrag => ({ kind: 'pan', box: o.viewport.box, clear })
    if (button === 1 || space.current || o.readOnly) return pan(false)
    if (o.mode === 'seats') return { kind: 'marquee', start: point, end: point, seat: attr('data-seat') }
    const handle = attr('data-handle')
    if (handle === 'rotate' && o.selection?.kind === 'block') {
      const id = o.selection.id
      const entry = o.blocks.find((item) => item.block.id === id)
      if (entry) {
        const origin = { x: entry.block.x, y: entry.block.y }
        return { kind: 'rotate', id, origin, startAngle: angleOf(point, origin), base: entry.rotation, delta: 0 }
      }
    }
    if (handle?.startsWith('stage-')) {
      return { kind: 'stage', handle: handle.slice(6) as StageHandle, start: point, origin: o.stage, rect: o.stage }
    }
    if (attr('data-stage') !== null) {
      o.onSelect({ kind: 'stage' })
      return { kind: 'stage', handle: 'body', start: point, origin: o.stage, rect: o.stage }
    }
    const blockId = attr('data-block')
    if (blockId) {
      o.onSelect({ kind: 'block', id: blockId })
      return o.lockedIds.has(blockId) ? null : { kind: 'block', id: blockId, start: point, dx: 0, dy: 0 }
    }
    return pan(true)
  }

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg || event.button === 2 || dragRef.current) return
    meta.current = { sx: event.clientX, sy: event.clientY, moved: false }
    const next = start(event.target as Element, toSvgPoint(svg, event.clientX, event.clientY), event.button)
    if (!next) return
    svg.setPointerCapture(event.pointerId)
    set(next)
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const current = dragRef.current
    const svg = svgRef.current
    if (!current || !svg) return
    const m = meta.current
    if (!m.moved && Math.hypot(event.clientX - m.sx, event.clientY - m.sy) > 3) m.moved = true
    if (current.kind === 'pan') {
      const rect = svg.getBoundingClientRect()
      const units = Math.max(current.box.w / rect.width, current.box.h / rect.height)
      const { box } = current
      viewport.setBox({ ...box, x: box.x - (event.clientX - m.sx) * units, y: box.y - (event.clientY - m.sy) * units })
      return
    }
    const point = toSvgPoint(svg, event.clientX, event.clientY)
    if (current.kind === 'block') set({ ...current, dx: point.x - current.start.x, dy: point.y - current.start.y })
    if (current.kind === 'marquee') set({ ...current, end: point })
    if (current.kind === 'stage') set({ ...current, rect: resizeStage(current.handle, current.origin, point.x - current.start.x, point.y - current.start.y) })
    if (current.kind === 'rotate') {
      let total = current.base + angleOf(point, current.origin) - current.startAngle
      // Shift mengunci sudut ke kelipatan 15 derajat.
      if (event.shiftKey) total = Math.round(total / 15) * 15
      set({ ...current, delta: total - current.base })
    }
  }

  const finish = (current: CanvasDrag) => {
    const o = options
    const moved = meta.current.moved
    if (current.kind === 'pan' && current.clear && !moved) o.onSelect(null)
    if (current.kind === 'block' && moved) {
      const dx = Math.round(current.dx)
      const dy = Math.round(current.dy)
      if (dx !== 0 || dy !== 0) o.onMoveBlock(current.id, dx, dy)
    }
    if (current.kind === 'rotate' && moved) o.onRotateBlock(current.id, normalizeAngle(current.base + current.delta))
    if (current.kind === 'stage' && moved) o.onStageChange(clampStage(current.rect, o.canvas.width, o.canvas.height))
    if (current.kind === 'marquee') {
      if (!moved) {
        if (current.seat) o.onSeatsPicked([current.seat])
        return
      }
      const box = boxFrom(current.start, current.end)
      const labels: string[] = []
      for (const entry of o.blocks) for (const seat of entry.seats) if (inBox(seat, box)) labels.push(seat.label)
      if (labels.length > 0) o.onSeatsPicked(labels)
    }
  }

  const end = (commit: boolean) => () => {
    const current = dragRef.current
    set(null)
    if (current && commit) finish(current)
  }

  return { drag, onPointerDown, onPointerMove, onPointerUp: end(true), onPointerCancel: end(false) }
}
