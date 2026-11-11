// Geser, cubit, dan zoom untuk denah. Semua gestur memakai satu cara hitung:
// titik kanvas yang dipegang jari (jangkar) ditaruh tepat di bawah jari lagi
// pada skala yang baru. Dengan begitu geser dan cubit tidak pernah melompat.
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { SeatMapLayout } from '@/types/catalog'
import { SEAT_RADIUS, ZOOM_STEP, anchoredView, canvasPoint, clampView, keyAction, panned, unitsPerPixel, wheelScale, zoomAt } from './seat-map-geometry'
import type { Frame, Point, SeatView } from './seat-map-geometry'

type Gesture = { kind: 'pan'; anchor: Point; start: Point } | { kind: 'pinch'; anchor: Point; distance: number; scale: number }

const DRAG_THRESHOLD = 6
// Di bawah ukuran ini kursi terlalu kecil untuk jari. Ketukan pertama
// memperbesar denah dulu, baru ketukan berikutnya memilih (PRD: minimal 32 px).
const MIN_TOUCH_RADIUS_PX = 12
const TARGET_TOUCH_RADIUS_PX = 17

export function useSeatMapViewport(layout: SeatMapLayout, initialView: SeatView) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setViewState] = useState(initialView)
  const viewRef = useRef(view)
  const pointers = useRef(new Map<number, Point>())
  const gesture = useRef<Gesture | null>(null)
  const dragged = useRef(false)
  const pointerType = useRef('mouse')

  // Denah lain (ukuran kanvas berubah) berarti tampilan awal yang baru.
  const sizeKey = `${layout.canvasWidth}x${layout.canvasHeight}`
  const [shownKey, setShownKey] = useState(sizeKey)
  if (shownKey !== sizeKey) {
    setShownKey(sizeKey)
    setViewState(initialView)
  }

  useEffect(() => {
    viewRef.current = view
  }, [view])

  const commit = useCallback(
    (next: SeatView) => {
      const clamped = clampView(next, layout)
      viewRef.current = clamped
      setViewState(clamped)
    },
    [layout],
  )

  // Ukuran SVG di layar dibaca saat dibutuhkan saja; tidak ada state per gerakan.
  const frame = useCallback((): Frame | null => {
    const rect = svgRef.current?.getBoundingClientRect()
    return rect && rect.width > 0 && rect.height > 0 ? rect : null
  }, [])

  const canvasAt = useCallback(
    (client: Point, current: SeatView): Point | null => {
      const box = frame()
      return box ? canvasPoint(box, layout, current, client) : null
    },
    [frame, layout],
  )

  const placeAnchor = useCallback(
    (anchor: Point, client: Point, scale: number) => {
      const box = frame()
      if (box) commit(anchoredView(box, layout, anchor, client, scale))
    },
    [commit, frame, layout],
  )

  const startGesture = useCallback(() => {
    const points = [...pointers.current.values()]
    if (points.length === 1) {
      const anchor = canvasAt(points[0], viewRef.current)
      gesture.current = anchor ? { kind: 'pan', anchor, start: points[0] } : null
    } else if (points.length >= 2) {
      const [a, b] = points
      const anchor = canvasAt({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, viewRef.current)
      gesture.current = anchor ? { kind: 'pinch', anchor, distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale: viewRef.current.scale } : null
    } else {
      gesture.current = null
    }
  }, [canvasAt])

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointerType.current = event.pointerType
    if (pointers.current.size === 0) dragged.current = false
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size > 1) dragged.current = true
    startGesture()
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const current = gesture.current
    if (!current) return
    if (current.kind === 'pan') {
      const moved = Math.hypot(event.clientX - current.start.x, event.clientY - current.start.y)
      if (!dragged.current && moved < DRAG_THRESHOLD) return
      if (!dragged.current) {
        dragged.current = true
        // Tangkap pointer baru setelah benar-benar digeser, supaya klik biasa
        // tetap sampai ke kursi yang diklik.
        event.currentTarget.setPointerCapture(event.pointerId)
      }
      placeAnchor(current.anchor, { x: event.clientX, y: event.clientY }, viewRef.current.scale)
      return
    }
    const [a, b] = [...pointers.current.values()]
    if (!a || !b) return
    const distance = Math.hypot(a.x - b.x, a.y - b.y)
    placeAnchor(current.anchor, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, current.scale * (distance / current.distance))
  }

  const onPointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.delete(event.pointerId)) return
    // Sisa satu jari setelah mencubit: lanjut geser dari posisi jari itu.
    startGesture()
  }

  // Wheel dipasang manual karena listener wheel dari React bersifat pasif dan
  // tidak bisa mencegah halaman ikut menggulir. Zoom hanya dengan Ctrl/Cmd atau
  // cubit trackpad (yang dikirim browser sebagai wheel + ctrlKey); gulir biasa
  // tetap menggulir halaman supaya pembeli tidak terjebak di dalam denah.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const anchor = canvasAt({ x: event.clientX, y: event.clientY }, viewRef.current)
      if (!anchor) return
      placeAnchor(anchor, { x: event.clientX, y: event.clientY }, wheelScale(viewRef.current.scale, event.deltaY))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [canvasAt, placeAnchor])

  const zoomBy = useCallback((factor: number) => {
    const current = viewRef.current
    commit(zoomAt(current, layout, current.scale * factor, current.cx, current.cy))
  }, [commit, layout])

  const reset = useCallback(() => commit(initialView), [commit, initialView])

  const pan = useCallback((dx: number, dy: number) => commit(panned(viewRef.current, layout, dx, dy)), [commit, layout])

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const action = keyAction(event.key)
    if (!action) return
    event.preventDefault()
    if (action.kind === 'pan') pan(action.dx, action.dy)
    else if (action.kind === 'zoom') zoomBy(action.factor)
    else reset()
  }

  // Ketukan jari pada kursi yang masih terlalu kecil: perbesar ke titik itu.
  // Mengembalikan true kalau ketukan dipakai untuk zoom, bukan untuk memilih.
  const zoomIfTooSmall = (client: Point): boolean => {
    if (pointerType.current !== 'touch') return false
    const box = frame()
    const current = viewRef.current
    if (!box) return false
    const radiusPx = SEAT_RADIUS / (unitsPerPixel(box, layout) / current.scale)
    if (radiusPx >= MIN_TOUCH_RADIUS_PX) return false
    const anchor = canvasAt(client, current)
    if (!anchor) return false
    placeAnchor(anchor, client, current.scale * (TARGET_TOUCH_RADIUS_PX / radiusPx))
    return true
  }

  // Fokus keyboard ke kursi di luar layar: geser denah supaya kursinya terlihat.
  const revealElement = (element: Element) => {
    const svg = svgRef.current
    if (!svg) return
    const box = element.getBoundingClientRect()
    const frame = svg.getBoundingClientRect()
    const inside = box.left >= frame.left && box.right <= frame.right && box.top >= frame.top && box.bottom <= frame.bottom
    if (inside) return
    const target = canvasAt({ x: box.left + box.width / 2, y: box.top + box.height / 2 }, viewRef.current)
    if (target) commit({ ...viewRef.current, cx: target.x, cy: target.y })
  }

  return {
    svgRef,
    view,
    wasDragged: () => dragged.current,
    handlers: { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd },
    onKeyDown,
    zoomIn: () => zoomBy(ZOOM_STEP),
    zoomOut: () => zoomBy(1 / ZOOM_STEP),
    reset,
    zoomIfTooSmall,
    revealElement,
  }
}
