import type { ManageSeat, ManageSeatStatus, SeatStage } from '@/types/seating'

export type Point = { x: number; y: number }

export type Box = { minX: number; minY: number; maxX: number; maxY: number }

// Bentuk minimum yang dibutuhkan untuk menggambar satu kursi. Kursi dari server
// dan kursi pratinjau sama-sama dipetakan ke sini.
export type SeatDot = { label: string; x: number; y: number; status: ManageSeatStatus }

// Jarak kursi terkecil yang diizinkan server 16, jadi jari-jari 7 tidak pernah
// membuat dua kursi dalam satu blok saling tumpuk.
export const SEAT_RADIUS = 7

export const STAGE_MIN = { width: 40, height: 20 }

export type StageHandle = 'body' | 'nw' | 'ne' | 'sw' | 'se'

export const EMPTY_SEATS: readonly SeatDot[] = []

export function isLocked(status: ManageSeatStatus): boolean {
  return status === 'held' || status === 'sold'
}

// Kotak blok dihitung dalam koordinat "sebelum diputar" di sekitar titik poros,
// supaya bingkainya bisa ikut diputar dengan transform yang sama.
export function localBounds(seats: readonly SeatDot[], origin: Point, rotation: number): Box {
  if (seats.length === 0) {
    return { minX: origin.x - 40, minY: origin.y - 20, maxX: origin.x + 40, maxY: origin.y + 20 }
  }
  const rad = (-rotation * Math.PI) / 180
  const sin = Math.sin(rad)
  const cos = Math.cos(rad)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const seat of seats) {
    const dx = seat.x - origin.x
    const dy = seat.y - origin.y
    const x = origin.x + dx * cos - dy * sin
    const y = origin.y + dx * sin + dy * cos
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  const pad = SEAT_RADIUS + 6
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad }
}

// getScreenCTM sudah memperhitungkan viewBox dan preserveAspectRatio, jadi
// tidak perlu menghitung skala zoom sendiri.
export function toSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const matrix = svg.getScreenCTM()
  if (!matrix) return { x: clientX, y: clientY }
  const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse())
  return { x: point.x, y: point.y }
}

export function angleOf(point: Point, origin: Point): number {
  return (Math.atan2(point.y - origin.y, point.x - origin.x) * 180) / Math.PI
}

export function normalizeAngle(deg: number): number {
  let value = deg % 360
  if (value > 180) value -= 360
  if (value < -180) value += 360
  return Math.round(value)
}

export function boxFrom(a: Point, b: Point): Box {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  }
}

export function inBox(point: Point, box: Box): boolean {
  return point.x >= box.minX && point.x <= box.maxX && point.y >= box.minY && point.y <= box.maxY
}

// Server menolak panggung yang keluar kanvas, jadi dijepit dulu sebelum dikirim.
export function clampStage(stage: SeatStage, canvasWidth: number, canvasHeight: number): SeatStage {
  const width = Math.round(Math.min(Math.max(stage.width, STAGE_MIN.width), canvasWidth))
  const height = Math.round(Math.min(Math.max(stage.height, STAGE_MIN.height), canvasHeight))
  const x = Math.round(Math.min(Math.max(stage.x, 0), canvasWidth - width))
  const y = Math.round(Math.min(Math.max(stage.y, 0), canvasHeight - height))
  return { ...stage, x, y, width, height }
}

export function lockedBlockIds(seatsByBlock: Record<string, ManageSeat[]>): Set<string> {
  const ids = new Set<string>()
  for (const [blockId, seats] of Object.entries(seatsByBlock)) {
    if (seats.some((seat) => isLocked(seat.status))) ids.add(blockId)
  }
  return ids
}

// Sudut yang ditarik bergerak, sisi seberangnya diam. Ukuran tidak boleh
// mengecil di bawah STAGE_MIN supaya label panggung tetap terbaca.
export function resizeStage(handle: StageHandle, origin: SeatStage, dx: number, dy: number): SeatStage {
  if (handle === 'body') return { ...origin, x: origin.x + dx, y: origin.y + dy }
  const right = origin.x + origin.width
  const bottom = origin.y + origin.height
  const next = { ...origin }
  if (handle.includes('w')) {
    next.x = Math.min(origin.x + dx, right - STAGE_MIN.width)
    next.width = right - next.x
  } else {
    next.width = Math.max(STAGE_MIN.width, origin.width + dx)
  }
  if (handle.includes('n')) {
    next.y = Math.min(origin.y + dy, bottom - STAGE_MIN.height)
    next.height = bottom - next.y
  } else {
    next.height = Math.max(STAGE_MIN.height, origin.height + dy)
  }
  return next
}
