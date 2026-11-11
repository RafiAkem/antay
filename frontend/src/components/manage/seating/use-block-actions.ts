import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { createSeatBlock, deleteSeatBlock, saveSeatLayout, updateSeatBlock } from '@/lib/seating-api'
import type { ManageSeat, SeatBlock, SeatBlockSpec, SeatLayout } from '@/types/seating'
import { changedFields, newBlockSpec, shapeChanged } from './block-form'
import { blockErrorMessage, issuesOf, layoutErrorMessage, type Selection } from './seating-labels'
import type { SeatMapApi } from './use-seat-map'

export type BusyKind = 'create' | 'save' | 'delete' | 'layout'

type Options = {
  eventId: string
  seatMap: SeatMapApi
  select: (selection: Selection) => void
}

// Geser dengan panah dikumpulkan dulu, baru dikirim sekali setelah tombol
// dilepas sebentar. Tanpa ini, menahan panah mengirim puluhan PATCH.
const NUDGE_DELAY = 450

export function useBlockActions({ eventId, seatMap, select }: Options) {
  const toast = useToast()
  const [busy, setBusy] = useState<BusyKind | null>(null)
  const [syncing, setSyncing] = useState(0)
  const [warnings, setWarnings] = useState<Record<string, string[]>>({})
  const mapRef = useRef(seatMap.map)
  const nudges = useRef(new Map<string, { timer: number; dx: number; dy: number }>())
  const { upsertBlock, removeBlock, setBlockSeats, shiftBlock, rotateBlock, setLayout, reload } = seatMap

  useEffect(() => {
    mapRef.current = seatMap.map
  }, [seatMap.map])

  useEffect(() => {
    const pending = nudges.current
    return () => pending.forEach((entry) => window.clearTimeout(entry.timer))
  }, [])

  const remember = useCallback((id: string, list: string[]) => {
    setWarnings((prev) => ({ ...prev, [id]: list }))
  }, [])

  const inBackground = useCallback(async (work: () => Promise<void>) => {
    setSyncing((count) => count + 1)
    try {
      await work()
    } finally {
      setSyncing((count) => count - 1)
    }
  }, [])

  const create = async (categoryId: string) => {
    const current = mapRef.current
    if (!current) return
    setBusy('create')
    try {
      const result = await createSeatBlock(eventId, newBlockSpec(categoryId, current.blocks, current.layout))
      upsertBlock(result.block)
      remember(result.block.id, result.warnings)
      select({ kind: 'block', id: result.block.id })
      toast.show(`${result.block.name} ditambahkan dengan ${result.seatCount} kursi.`, 'ok')
      await reload(true)
    } catch (cause) {
      toast.error(blockErrorMessage(cause, 'create'))
    } finally {
      setBusy(null)
    }
  }

  // Mengembalikan galat per field dari server, atau null bila berhasil.
  const save = async (block: SeatBlock, spec: SeatBlockSpec, previewSeats: ManageSeat[] | null) => {
    const patch = changedFields(spec, block)
    if (Object.keys(patch).length === 0) return null
    const reshaped = shapeChanged(spec, block) || patch.categoryId !== undefined
    setBusy('save')
    try {
      const result = await updateSeatBlock(block.id, patch)
      upsertBlock(result.block)
      // Pratinjau dipasang dulu supaya kanvas tidak sempat kembali ke bentuk lama
      // selama denah dimuat ulang.
      if (reshaped && previewSeats) setBlockSeats(block.id, previewSeats)
      remember(block.id, result.warnings)
      toast.show(`${result.block.name} tersimpan.`, 'ok')
      if (reshaped) void reload(true)
      return null
    } catch (cause) {
      toast.error(blockErrorMessage(cause, 'save'))
      return issuesOf(cause)
    } finally {
      setBusy(null)
    }
  }

  const remove = async (block: SeatBlock) => {
    setBusy('delete')
    try {
      await deleteSeatBlock(block.id)
      removeBlock(block.id)
      select(null)
      toast.show(`${block.name} dihapus.`, 'ok')
      return true
    } catch (cause) {
      toast.error(blockErrorMessage(cause, 'delete'))
      return false
    } finally {
      setBusy(null)
    }
  }

  const move = useCallback(
    (id: string, dx: number, dy: number) => {
      const block = mapRef.current?.blocks.find((item) => item.id === id)
      if (!block) return
      shiftBlock(id, dx, dy)
      void inBackground(async () => {
        try {
          const result = await updateSeatBlock(id, { x: block.x + dx, y: block.y + dy })
          remember(id, result.warnings)
        } catch (cause) {
          shiftBlock(id, -dx, -dy)
          toast.error(blockErrorMessage(cause, 'save'))
        }
      })
    },
    [inBackground, remember, shiftBlock, toast],
  )

  const nudge = useCallback(
    (id: string, dx: number, dy: number) => {
      shiftBlock(id, dx, dy)
      const pending = nudges.current.get(id) ?? { timer: 0, dx: 0, dy: 0 }
      window.clearTimeout(pending.timer)
      const total = { dx: pending.dx + dx, dy: pending.dy + dy }
      const timer = window.setTimeout(() => {
        nudges.current.delete(id)
        const block = mapRef.current?.blocks.find((item) => item.id === id)
        if (!block) return
        void inBackground(async () => {
          try {
            const result = await updateSeatBlock(id, { x: block.x, y: block.y })
            remember(id, result.warnings)
          } catch (cause) {
            shiftBlock(id, -total.dx, -total.dy)
            toast.error(blockErrorMessage(cause, 'save'))
          }
        })
      }, NUDGE_DELAY)
      nudges.current.set(id, { timer, ...total })
    },
    [inBackground, remember, shiftBlock, toast],
  )

  const rotate = useCallback(
    (id: string, rotation: number) => {
      const block = mapRef.current?.blocks.find((item) => item.id === id)
      if (!block || block.rotation === rotation) return
      const previous = block.rotation
      rotateBlock(id, rotation)
      void inBackground(async () => {
        try {
          const result = await updateSeatBlock(id, { rotation })
          remember(id, result.warnings)
          await reload(true)
        } catch (cause) {
          rotateBlock(id, previous)
          toast.error(blockErrorMessage(cause, 'save'))
        }
      })
    },
    [inBackground, reload, remember, rotateBlock, toast],
  )

  const saveLayout = useCallback(
    async (next: SeatLayout, announce = false) => {
      const previous = mapRef.current?.layout
      if (!previous) return false
      setLayout(next)
      setBusy('layout')
      try {
        setLayout(await saveSeatLayout(eventId, next))
        if (announce) toast.show('Denah tersimpan.', 'ok')
        return true
      } catch (cause) {
        setLayout(previous)
        toast.error(layoutErrorMessage(cause))
        return false
      } finally {
        setBusy(null)
      }
    },
    [eventId, setLayout, toast],
  )

  return { busy, syncing: syncing > 0, warnings, create, save, remove, move, nudge, rotate, saveLayout }
}
