import { useCallback, useMemo, useState } from 'react'
import type { ManageSeat, SeatBlock } from '@/types/seating'
import { changedFields, parseForm, shapeChanged, toForm, type BlockForm, type FormIssues } from './block-form'
import type { SeatDot } from './seat-geometry'
import { useBlockPreview } from './use-block-preview'

type Draft = { id: string; form: BlockForm }
type ServerIssues = { id: string; issues: Record<string, string> }

// Draf disimpan per id blok. Ganti pilihan ke blok lain lalu kembali tidak
// menghapus ketikan, dan simpan yang berhasil cukup membuang drafnya.
export function useBlockDraft(eventId: string, block: SeatBlock | null, seats: ManageSeat[]) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [server, setServer] = useState<ServerIssues | null>(null)

  const form = block ? (draft?.id === block.id ? draft.form : toForm(block)) : null
  const parsed = useMemo(() => (form && block ? parseForm(form, block) : null), [form, block])
  const spec = parsed?.spec ?? null
  const hasDraft = !!block && draft?.id === block.id
  const dirty = hasDraft && (!spec || Object.keys(changedFields(spec, block)).length > 0)
  const previewSpec = block && spec && shapeChanged(spec, block) ? spec : null
  const preview = useBlockPreview(eventId, block?.id ?? null, previewSpec)

  // Kursi yang sudah dimatikan tetap mati setelah blok dibentuk ulang (server
  // mempertahankannya per label), jadi pratinjau juga menggambarnya mati.
  const disabled = useMemo(
    () => new Set(seats.filter((seat) => seat.status === 'disabled').map((seat) => seat.label)),
    [seats],
  )
  // Selama pratinjau baru belum datang, kursi pratinjau lama digeser dan
  // diputar ke posisi blok sekarang. Tanpa ini blok sempat melompat balik
  // sesudah diseret atau saat slider rotasi digerakkan.
  const previewSeats = preview?.seats ?? null
  const origin = preview?.origin ?? null
  const previewRotation = spec?.rotation ?? origin?.rotation ?? block?.rotation ?? 0
  const dx = block && origin ? block.x - origin.x : 0
  const dy = block && origin ? block.y - origin.y : 0
  const turn = origin ? previewRotation - origin.rotation : 0
  const previewDots = useMemo<SeatDot[] | null>(() => {
    if (!previewSeats || !origin) return null
    const rad = (turn * Math.PI) / 180
    const sin = Math.sin(rad)
    const cos = Math.cos(rad)
    return previewSeats.map((seat) => {
      const rx = seat.x - origin.x
      const ry = seat.y - origin.y
      return {
        label: seat.label,
        x: origin.x + dx + (turn ? rx * cos - ry * sin : rx),
        y: origin.y + dy + (turn ? rx * sin + ry * cos : ry),
        status: disabled.has(seat.label) ? 'disabled' : 'available',
      }
    })
  }, [previewSeats, origin, disabled, dx, dy, turn])

  const update = useCallback(
    (patch: Partial<BlockForm>) => {
      if (!block || !form) return
      setDraft({ id: block.id, form: { ...form, ...patch } })
      setServer(null)
    },
    [block, form],
  )

  // Dipakai saat blok diputar lewat pegangan di kanvas: draf yang sedang
  // terbuka ikut memakai sudut baru supaya pratinjaunya tidak memutar balik.
  const sync = useCallback((id: string, patch: Partial<BlockForm>) => {
    setDraft((current) => (current && current.id === id ? { ...current, form: { ...current.form, ...patch } } : current))
  }, [])

  const reset = useCallback(() => {
    setDraft(null)
    setServer(null)
  }, [])

  const fail = useCallback((id: string, issues: Record<string, string>) => setServer({ id, issues }), [])

  const issues: FormIssues = {
    ...(preview?.issues ?? {}),
    ...(server && block && server.id === block.id ? server.issues : {}),
    ...(parsed?.issues ?? {}),
  }

  // Kursi pratinjau dalam bentuk kursi server, dipasang sementara setelah simpan.
  const toSeats = (target: SeatBlock): ManageSeat[] | null =>
    preview?.seats && spec
      ? preview.seats.map((seat) => ({
          ...seat,
          id: seat.label,
          blockId: target.id,
          categoryId: spec.categoryId,
          status: disabled.has(seat.label) ? 'disabled' : 'available',
        }))
      : null

  return { form, spec, issues, dirty, preview, previewDots, previewRotation, update, sync, reset, fail, toSeats }
}

export type BlockDraft = ReturnType<typeof useBlockDraft>
