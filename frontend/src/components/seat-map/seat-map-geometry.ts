// Hitungan murni untuk denah: tampilan (pusat + skala), batas gerak, dan posisi
// label blok. Dipisah dari komponen supaya bisa dipakai editor denah juga.
import type { SeatMapBlock, SeatMapLayout, SeatMapSeat } from '@/types/catalog'

export const SEAT_RADIUS = 8
export const MIN_SCALE = 1
export const MAX_SCALE = 8
export const ZOOM_STEP = 1.6

// Tampilan dinyatakan sebagai titik tengah (satuan kanvas) dan skala. Skala 1
// artinya seluruh kanvas terlihat.
export type SeatView = { cx: number; cy: number; scale: number }

export type SeatVisual = 'available' | 'selected' | 'taken' | 'disabled'

export type Point = { x: number; y: number }
export type Frame = { left: number; top: number; width: number; height: number }

// Satuan kanvas per piksel layar pada skala 1. SVG memakai "meet", jadi yang
// menentukan adalah sisi yang paling sesak.
export function unitsPerPixel(frame: Frame, layout: SeatMapLayout): number {
  return Math.max(layout.canvasWidth / frame.width, layout.canvasHeight / frame.height)
}

// Titik kanvas di bawah titik layar. Pusat SVG selalu memetakan ke pusat tampilan.
export function canvasPoint(frame: Frame, layout: SeatMapLayout, view: SeatView, client: Point): Point {
  const factor = unitsPerPixel(frame, layout) / view.scale
  return { x: view.cx + (client.x - frame.left - frame.width / 2) * factor, y: view.cy + (client.y - frame.top - frame.height / 2) * factor }
}

// Tampilan yang menaruh titik kanvas anchor tepat di bawah titik layar client.
// Skala dipotong dulu; kalau baru dipotong di clampView, titik pusatnya
// terhitung dengan skala yang salah dan denah melompat di batas zoom.
export function anchoredView(frame: Frame, layout: SeatMapLayout, anchor: Point, client: Point, wantedScale: number): SeatView {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, wantedScale))
  const factor = unitsPerPixel(frame, layout) / scale
  return clampView({ scale, cx: anchor.x - (client.x - frame.left - frame.width / 2) * factor, cy: anchor.y - (client.y - frame.top - frame.height / 2) * factor }, layout)
}

export function fullView(layout: SeatMapLayout): SeatView {
  return { cx: layout.canvasWidth / 2, cy: layout.canvasHeight / 2, scale: 1 }
}

function clampAxis(center: number, size: number, scale: number): number {
  const half = size / scale / 2
  if (half * 2 >= size) return size / 2
  return Math.min(size - half, Math.max(half, center))
}

// Denah tidak boleh digeser sampai hilang dari layar.
export function clampView(view: SeatView, layout: SeatMapLayout): SeatView {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale))
  return {
    scale,
    cx: clampAxis(view.cx, layout.canvasWidth, scale),
    cy: clampAxis(view.cy, layout.canvasHeight, scale),
  }
}

export function viewBox(view: SeatView, layout: SeatMapLayout): string {
  const width = layout.canvasWidth / view.scale
  const height = layout.canvasHeight / view.scale
  return `${view.cx - width / 2} ${view.cy - height / 2} ${width} ${height}`
}

// Perbesar sambil menjaga titik jangkar tetap di bawah jari atau kursor.
export function zoomAt(view: SeatView, layout: SeatMapLayout, nextScale: number, anchorX: number, anchorY: number): SeatView {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale))
  const ratio = view.scale / scale
  return clampView({ scale, cx: anchorX - (anchorX - view.cx) * ratio, cy: anchorY - (anchorY - view.cy) * ratio }, layout)
}

// Tampilan awal yang langsung menyorot kursi kategori pilihan. Tanpa ini, di
// ponsel 360 px kanvas selebar 1.200 satuan membuat kursi cuma beberapa piksel.
export function fitSeats(layout: SeatMapLayout, seats: SeatMapSeat[]): SeatView {
  if (seats.length === 0) return fullView(layout)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const seat of seats) {
    minX = Math.min(minX, seat.x)
    minY = Math.min(minY, seat.y)
    maxX = Math.max(maxX, seat.x)
    maxY = Math.max(maxY, seat.y)
  }
  const pad = SEAT_RADIUS * 4
  const width = maxX - minX + pad * 2
  const height = maxY - minY + pad * 2
  const scale = Math.min(layout.canvasWidth / width, layout.canvasHeight / height)
  return clampView({ cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, scale }, layout)
}

export type BlockLabel = { id: string; text: string; x: number; y: number; categoryId: string }

// Label blok ditaruh di atas kursi teratasnya, di tengah lebar blok.
export function blockLabels(blocks: SeatMapBlock[], seats: SeatMapSeat[]): BlockLabel[] {
  const bounds = new Map<string, { minX: number; maxX: number; minY: number }>()
  for (const seat of seats) {
    const box = bounds.get(seat.blockId)
    if (box) {
      box.minX = Math.min(box.minX, seat.x)
      box.maxX = Math.max(box.maxX, seat.x)
      box.minY = Math.min(box.minY, seat.y)
    } else {
      bounds.set(seat.blockId, { minX: seat.x, maxX: seat.x, minY: seat.y })
    }
  }
  return blocks.flatMap((block) => {
    const box = bounds.get(block.id)
    if (!box) return []
    return [{ id: block.id, text: block.name || block.code, x: (box.minX + box.maxX) / 2, y: box.minY - SEAT_RADIUS * 2.2, categoryId: block.categoryId }]
  })
}

export const VISUAL_TEXT: Record<SeatVisual, string> = {
  available: 'tersedia',
  selected: 'dipilih',
  taken: 'sudah terisi',
  disabled: 'tidak dipakai',
}

export type KeyAction = { kind: 'pan'; dx: number; dy: number } | { kind: 'zoom'; factor: number } | { kind: 'reset' }

// Panah menggeser, plus/minus memperbesar, 0 mengembalikan tampilan awal.
export function keyAction(key: string): KeyAction | null {
  const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
  if (moves[key]) return { kind: 'pan', dx: moves[key][0], dy: moves[key][1] }
  if (key === '+' || key === '=') return { kind: 'zoom', factor: ZOOM_STEP }
  if (key === '-' || key === '_') return { kind: 'zoom', factor: 1 / ZOOM_STEP }
  return key === '0' ? { kind: 'reset' } : null
}

// Geser 15% dari lebar atau tinggi yang sedang terlihat per tekanan panah.
export function panned(view: SeatView, layout: SeatMapLayout, dx: number, dy: number): SeatView {
  const stepX = (layout.canvasWidth / view.scale) * 0.15
  const stepY = (layout.canvasHeight / view.scale) * 0.15
  return { ...view, cx: view.cx + dx * stepX, cy: view.cy + dy * stepY }
}

// Satu notch roda mouse bisa bernilai 100 lebih, cubit trackpad cuma beberapa
// satuan. Dipotong supaya satu notch tidak langsung zoom 3x.
export function wheelScale(scale: number, deltaY: number): number {
  const delta = Math.max(-40, Math.min(40, deltaY))
  return scale * Math.exp(-delta * 0.01)
}
