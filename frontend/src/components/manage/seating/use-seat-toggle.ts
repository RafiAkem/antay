import { useCallback, useMemo, useRef, useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { changeSeatStatus } from '@/lib/seating-api'
import type { ManageSeat, ManageSeatStatus } from '@/types/seating'
import { isLocked } from './seat-geometry'
import { seatErrorMessage } from './seating-labels'
import type { MapState, SeatMapApi } from './use-seat-map'

export function useSeatToggle(eventId: string, seatMap: SeatMapApi, map: MapState) {
  const toast = useToast()
  const [pending, setPending] = useState(0)
  // Permintaan dikirim berurutan. Klik cepat dua kali di kursi yang sama
  // (matikan lalu nyalakan) tidak boleh sampai di server terbalik urutannya.
  const queue = useRef<Promise<void>>(Promise.resolve())
  const { setSeatStatus, reload } = seatMap

  const byLabel = useMemo(() => {
    const index = new Map<string, ManageSeat>()
    for (const seats of Object.values(map.seatsByBlock)) for (const seat of seats) index.set(seat.label, seat)
    return index
  }, [map.seatsByBlock])

  // Satu kotak pilihan berisi campuran? Kalau semuanya sudah mati, kotak itu
  // menyalakan; selain itu mematikan yang masih tersedia.
  const toggle = useCallback(
    (labels: string[]) => {
      const seats = labels.map((label) => byLabel.get(label)).filter((seat): seat is ManageSeat => !!seat)
      const open = seats.filter((seat) => !isLocked(seat.status))
      if (open.length === 0) {
        if (seats.length > 0) toast.show('Kursi yang sudah terjual atau ditahan tidak bisa diubah.', 'info')
        return
      }
      const enable = open.every((seat) => seat.status === 'disabled')
      const targets = enable ? open : open.filter((seat) => seat.status === 'available')
      const change = { disable: [] as string[], enable: [] as string[] }
      const next = new Map<string, ManageSeatStatus>()
      const previous = new Map<string, ManageSeatStatus>()
      for (const seat of targets) {
        const list = enable ? change.enable : change.disable
        list.push(seat.label)
        next.set(seat.label, enable ? 'available' : 'disabled')
        previous.set(seat.label, seat.status)
      }
      setSeatStatus(next)
      setPending((count) => count + 1)
      queue.current = queue.current.then(async () => {
        try {
          const saved = await changeSeatStatus(eventId, change)
          setSeatStatus(new Map(saved.map((seat) => [seat.label, seat.status])))
        } catch (cause) {
          setSeatStatus(previous)
          toast.error(seatErrorMessage(cause))
          void reload(true)
        } finally {
          setPending((count) => count - 1)
        }
      })
    },
    [byLabel, eventId, reload, setSeatStatus, toast],
  )

  return { toggle, saving: pending > 0 }
}
