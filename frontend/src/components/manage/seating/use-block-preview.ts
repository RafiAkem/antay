import { useEffect, useState } from 'react'
import { previewSeatBlock } from '@/lib/seating-api'
import type { PreviewSeat, SeatBlockSpec } from '@/types/seating'
import { isAbort, issuesOf } from './seating-labels'
import { ApiError } from '@/lib/api'

type Good = { blockId: string; key: string; seats: PreviewSeat[]; warnings: string[]; origin: PreviewOrigin }
type Failed = { key: string; message: string; issues: Record<string, string> }

// Posisi dan sudut blok saat pratinjau terakhir dihitung. Dipakai untuk
// menggeser atau memutar kursi lama selama hitungan baru belum datang.
export type PreviewOrigin = { x: number; y: number; rotation: number }

export type BlockPreview = {
  seats: PreviewSeat[] | null
  origin: PreviewOrigin | null
  warnings: string[]
  pending: boolean
  error: string | null
  issues: Record<string, string>
}

const DEBOUNCE = 200

// Hasil pratinjau terakhir yang berhasil tetap ditampilkan selama hitungan
// berikutnya berjalan, supaya kanvas tidak berkedip tiap kali angka diketik.
export function useBlockPreview(eventId: string, blockId: string | null, spec: SeatBlockSpec | null): BlockPreview | null {
  const key = spec && blockId ? JSON.stringify(spec) : ''
  const [good, setGood] = useState<Good | null>(null)
  const [failed, setFailed] = useState<Failed | null>(null)

  useEffect(() => {
    if (!key || !blockId) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      const spec = JSON.parse(key) as SeatBlockSpec
      const origin = { x: spec.x, y: spec.y, rotation: spec.rotation }
      previewSeatBlock(eventId, spec, controller.signal)
        .then((data) => {
          setGood({ blockId, key, seats: data.seats, warnings: data.warnings, origin })
          setFailed(null)
        })
        .catch((cause: unknown) => {
          if (isAbort(cause)) return
          const message =
            cause instanceof ApiError && cause.status !== 422
              ? 'Pratinjau belum bisa dihitung. Bentuk blok tetap bisa disimpan.'
              : 'Ada isian yang belum diterima server.'
          setFailed({ key, message, issues: issuesOf(cause) })
        })
    }, DEBOUNCE)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [eventId, blockId, key])

  if (!key || !blockId) return null
  const usable = good && good.blockId === blockId ? good : null
  const failure = failed && failed.key === key ? failed : null
  return {
    seats: usable?.seats ?? null,
    origin: usable?.origin ?? null,
    warnings: usable && usable.key === key ? usable.warnings : [],
    pending: usable?.key !== key && !failure,
    error: failure?.message ?? null,
    issues: failure?.issues ?? {},
  }
}
