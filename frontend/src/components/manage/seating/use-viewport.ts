import { useCallback, useState } from 'react'
import type { Point } from './seat-geometry'

export type ViewBox = { x: number; y: number; w: number; h: number }

const MARGIN = 24
const MIN_SCALE = 0.5
const MAX_SCALE = 8

function fit(width: number, height: number): ViewBox {
  return { x: -MARGIN, y: -MARGIN, w: width + MARGIN * 2, h: height + MARGIN * 2 }
}

// Zoom dan geser cukup mengubah viewBox. Isi SVG tidak ikut digambar ulang,
// karena grup kursi di-memo dan tidak bergantung pada viewBox.
export function useViewport(width: number, height: number) {
  const key = `${width}x${height}`
  const [state, setState] = useState<{ key: string; box: ViewBox }>(() => ({ key, box: fit(width, height) }))
  // Ukuran kanvas berubah: tampilan dikembalikan ke pas layar.
  const box = state.key === key ? state.box : fit(width, height)
  const base = fit(width, height)

  const setBox = useCallback((next: ViewBox) => setState({ key, box: next }), [key])

  const zoomAt = useCallback(
    (factor: number, at?: Point) => {
      setState((prev) => {
        const full = fit(width, height)
        const current = prev.key === key ? prev.box : full
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, (full.w / current.w) * factor))
        const w = full.w / scale
        const h = full.h / scale
        const cx = at?.x ?? current.x + current.w / 2
        const cy = at?.y ?? current.y + current.h / 2
        const x = cx - (cx - current.x) * (w / current.w)
        const y = cy - (cy - current.y) * (h / current.h)
        return { key, box: { x, y, w, h } }
      })
    },
    [key, width, height],
  )

  const reset = useCallback(() => setState({ key, box: fit(width, height) }), [key, width, height])

  return { box, scale: base.w / box.w, setBox, zoomAt, reset }
}

export type Viewport = ReturnType<typeof useViewport>
