import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchManageSeatMap } from '@/lib/seating-api'
import type { ManageSeat, ManageSeatMap, ManageSeatStatus, SeatBlock, SeatLayout } from '@/types/seating'
import { ApiError } from '@/lib/api'

// Kursi disimpan per blok. Mengubah status kursi di satu blok hanya mengganti
// array blok itu, jadi grup SVG blok lain (yang di-memo) tidak ikut digambar ulang.
export type MapState = {
  layout: SeatLayout
  blocks: SeatBlock[]
  seatsByBlock: Record<string, ManageSeat[]>
}

export type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' }

function toState(data: ManageSeatMap): MapState {
  const seatsByBlock: Record<string, ManageSeat[]> = {}
  for (const block of data.blocks) seatsByBlock[block.id] = []
  for (const seat of data.seats) (seatsByBlock[seat.blockId] ??= []).push(seat)
  return { layout: data.layout, blocks: data.blocks, seatsByBlock }
}

function rotateSeat(seat: ManageSeat, origin: SeatBlock, delta: number): ManageSeat {
  const rad = (delta * Math.PI) / 180
  const dx = seat.x - origin.x
  const dy = seat.y - origin.y
  return {
    ...seat,
    x: origin.x + Math.round(dx * Math.cos(rad) - dy * Math.sin(rad)),
    y: origin.y + Math.round(dx * Math.sin(rad) + dy * Math.cos(rad)),
  }
}

export function useSeatMap(eventId: string) {
  const [map, setMap] = useState<MapState | null>(null)
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const seqRef = useRef(0)

  // Nomor urut mencegah jawaban lama menimpa yang baru, misalnya saat dua
  // simpan berturut-turut sama-sama memuat ulang denah. Muat ulang 'silent'
  // dipakai setelah simpan dan tidak menampilkan galat, karena denah lama
  // masih bisa dipakai.
  const settle = useCallback((seq: number, silent: boolean) => {
    const ok = (data: ManageSeatMap) => {
      if (seq !== seqRef.current) return
      setMap(toState(data))
      setLoad({ status: 'ready' })
    }
    const fail = (cause: unknown) => {
      if (seq !== seqRef.current || silent) return
      const message = cause instanceof ApiError ? cause.message : 'Denah belum bisa dimuat. Coba lagi sebentar lagi.'
      setLoad({ status: 'error', message })
    }
    return [ok, fail] as const
  }, [])

  const reload = useCallback(
    (silent = false) => {
      if (!silent) setLoad({ status: 'loading' })
      const [ok, fail] = settle(++seqRef.current, silent)
      return fetchManageSeatMap(eventId).then(ok, fail)
    },
    [eventId, settle],
  )

  useEffect(() => {
    const [ok, fail] = settle(++seqRef.current, false)
    fetchManageSeatMap(eventId).then(ok, fail)
    return () => {
      seqRef.current += 1
    }
  }, [eventId, settle])

  const update = useCallback((change: (current: MapState) => MapState) => {
    setMap((current) => (current ? change(current) : current))
  }, [])

  const setLayout = useCallback((layout: SeatLayout) => update((m) => ({ ...m, layout })), [update])

  const upsertBlock = useCallback(
    (block: SeatBlock) =>
      update((m) => {
        const exists = m.blocks.some((item) => item.id === block.id)
        const blocks = exists ? m.blocks.map((item) => (item.id === block.id ? block : item)) : [...m.blocks, block]
        const seatsByBlock = m.seatsByBlock[block.id] ? m.seatsByBlock : { ...m.seatsByBlock, [block.id]: [] }
        return { ...m, blocks, seatsByBlock }
      }),
    [update],
  )

  const removeBlock = useCallback(
    (id: string) =>
      update((m) => {
        const seatsByBlock = { ...m.seatsByBlock }
        delete seatsByBlock[id]
        return { ...m, blocks: m.blocks.filter((block) => block.id !== id), seatsByBlock }
      }),
    [update],
  )

  const setBlockSeats = useCallback(
    (id: string, seats: ManageSeat[]) => update((m) => ({ ...m, seatsByBlock: { ...m.seatsByBlock, [id]: seats } })),
    [update],
  )

  // Posisi kursi linear terhadap x dan y blok, jadi geser blok sejauh bilangan
  // bulat menggeser tiap kursi tepat sejauh itu juga. Tidak perlu muat ulang.
  const shiftBlock = useCallback(
    (id: string, dx: number, dy: number) =>
      update((m) => ({
        ...m,
        blocks: m.blocks.map((block) => (block.id === id ? { ...block, x: block.x + dx, y: block.y + dy } : block)),
        seatsByBlock: {
          ...m.seatsByBlock,
          [id]: (m.seatsByBlock[id] ?? []).map((seat) => ({ ...seat, x: seat.x + dx, y: seat.y + dy })),
        },
      })),
    [update],
  )

  // Putaran lokal hanya perkiraan sampai denah dimuat ulang; pembulatan server
  // bisa beda satu satuan.
  const rotateBlock = useCallback(
    (id: string, rotation: number) =>
      update((m) => {
        const block = m.blocks.find((item) => item.id === id)
        if (!block) return m
        const delta = rotation - block.rotation
        return {
          ...m,
          blocks: m.blocks.map((item) => (item.id === id ? { ...item, rotation } : item)),
          seatsByBlock: {
            ...m.seatsByBlock,
            [id]: (m.seatsByBlock[id] ?? []).map((seat) => rotateSeat(seat, block, delta)),
          },
        }
      }),
    [update],
  )

  const setSeatStatus = useCallback(
    (statuses: Map<string, ManageSeatStatus>) =>
      update((m) => {
        const seatsByBlock: Record<string, ManageSeat[]> = {}
        for (const [blockId, seats] of Object.entries(m.seatsByBlock)) {
          const touched = seats.some((seat) => statuses.has(seat.label))
          seatsByBlock[blockId] = touched
            ? seats.map((seat) => {
                const status = statuses.get(seat.label)
                return status && status !== seat.status ? { ...seat, status } : seat
              })
            : seats
        }
        return { ...m, seatsByBlock }
      }),
    [update],
  )

  return { map, load, reload, setLayout, upsertBlock, removeBlock, setBlockSeats, shiftBlock, rotateBlock, setSeatStatus }
}

export type SeatMapApi = ReturnType<typeof useSeatMap>
