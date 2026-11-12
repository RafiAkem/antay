import { ApiError } from '@/lib/api'
import type { ManageSeatStatus } from '@/types/seating'

export type EditorMode = 'layout' | 'seats'

export type Selection = { kind: 'block'; id: string } | { kind: 'stage' } | null

export const STATUS_LABEL: Record<ManageSeatStatus, string> = {
  available: 'tersedia',
  held: 'sedang ditahan pesanan, tidak bisa diubah',
  sold: 'sudah terjual, tidak bisa diubah',
  disabled: 'tidak dipakai',
}

export function seatTitle(label: string, status: ManageSeatStatus): string {
  return `${label}, ${STATUS_LABEL[status]}`
}

export const LOCKED_SAVE =
  'Blok ini sudah punya kursi yang terjual atau ditahan, jadi bentuknya tidak bisa diubah.'

const EVENT_LOCKED = 'Event ini sudah tidak bisa diubah, jadi denahnya ikut terkunci.'

const BLOCK_MESSAGES: Record<string, string> = {
  BLOCK_LOCKED: LOCKED_SAVE,
  BLOCK_CODE_TAKEN: 'Kode blok ini sudah dipakai blok lain di event ini. Pilih kode lain.',
  CATEGORY_NOT_SEATED: 'Kategori ini tidak memakai kursi. Pilih kategori yang ditandai pakai kursi.',
  EVENT_NOT_EDITABLE: EVENT_LOCKED,
}

function fallback(cause: unknown, message: string): string {
  if (cause instanceof ApiError) return cause.message || message
  return message
}

export function blockErrorMessage(cause: unknown, action: 'save' | 'delete' | 'create'): string {
  if (cause instanceof ApiError && cause.code) {
    if (cause.code === 'BLOCK_LOCKED' && action === 'delete') {
      return 'Blok ini sudah punya kursi yang terjual atau ditahan, jadi tidak bisa dihapus.'
    }
    const known = BLOCK_MESSAGES[cause.code]
    if (known) return known
  }
  const generic = {
    save: 'Blok belum tersimpan. Coba lagi sebentar lagi.',
    delete: 'Blok belum terhapus. Coba lagi sebentar lagi.',
    create: 'Blok baru belum bisa dibuat. Coba lagi sebentar lagi.',
  }
  return fallback(cause, generic[action])
}

export function seatErrorMessage(cause: unknown): string {
  if (cause instanceof ApiError && cause.code === 'SEAT_LOCKED') {
    return 'Sebagian kursi itu sudah terjual atau ditahan, jadi statusnya tidak bisa diubah. Denah dimuat ulang.'
  }
  if (cause instanceof ApiError && cause.code === 'SEAT_NOT_FOUND') {
    return 'Sebagian kursi itu sudah tidak ada karena bloknya baru dibentuk ulang. Denah dimuat ulang.'
  }
  if (cause instanceof ApiError && cause.code === 'EVENT_NOT_EDITABLE') return EVENT_LOCKED
  return fallback(cause, 'Status kursi belum tersimpan. Coba lagi sebentar lagi.')
}

export function layoutErrorMessage(cause: unknown): string {
  if (cause instanceof ApiError && cause.code === 'EVENT_NOT_EDITABLE') return EVENT_LOCKED
  if (cause instanceof ApiError && cause.field.stage) return cause.field.stage
  if (cause instanceof ApiError && (cause.field.canvasWidth || cause.field.canvasHeight)) {
    return cause.field.canvasWidth ?? cause.field.canvasHeight
  }
  return fallback(cause, 'Denah belum tersimpan. Coba lagi sebentar lagi.')
}

export function issuesOf(cause: unknown): Record<string, string> {
  return cause instanceof ApiError ? cause.field : {}
}

export function isAbort(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === 'AbortError'
}
