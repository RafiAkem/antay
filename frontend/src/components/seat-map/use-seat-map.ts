import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/lib/api'
import { fetchSeatMap } from '@/lib/catalog-api'
import type { SeatMap } from '@/types/catalog'

type Result = { attempt: number; map: SeatMap | null; error: string | null }

// Denah dimuat saat langkah kursi dibuka dan bisa dimuat ulang kapan saja.
// Kursi yang sudah diambil orang lain dibereskan oleh pemanggil lewat onLoaded.
export function useSeatMap(eventId: string, onLoaded: (map: SeatMap) => void) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  // Disimpan di ref supaya denah dimuat per percobaan, bukan setiap kali
  // pilihan kursi berubah dan callback-nya ikut berganti.
  const onLoadedRef = useRef(onLoaded)

  useEffect(() => {
    onLoadedRef.current = onLoaded
  }, [onLoaded])

  useEffect(() => {
    const controller = new AbortController()
    fetchSeatMap(eventId, controller.signal).then(
      (map) => {
        setResult({ attempt, map, error: null })
        onLoadedRef.current(map)
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        const message = error instanceof ApiError ? error.message : 'Denah kursi belum bisa dimuat. Periksa koneksi lalu coba lagi.'
        setResult((previous) => ({ attempt, map: previous?.map ?? null, error: message }))
      },
    )
    return () => controller.abort()
  }, [eventId, attempt])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])
  const settled = result?.attempt === attempt
  // Saat memuat ulang, denah lama tetap tampil supaya layar tidak berkedip.
  return { map: result?.map ?? null, error: settled ? result.error : null, loading: !settled, reload }
}
