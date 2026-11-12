import { useCallback, useEffect, useState } from 'react'
import { messageOf } from './validation'

// Backend panel admin belum punya paginasi: satu GET mengembalikan semua
// baris. Daftarnya kecil (puluhan penyelenggara, puluhan akun), jadi cari dan
// filter dilakukan di klien. Kalau nanti backend menambah offset/limit, ganti
// hook ini, bukan halaman-halamannya.
//
// Skeleton hanya muncul di muatan pertama. Muat ulang sesudah simpan tetap
// menampilkan baris lama sampai yang baru datang, supaya tabel tidak berkedip.
export function useRemoteList<T>(fetcher: (signal: AbortSignal) => Promise<T[]>, fallbackError: string) {
  const [rows, setRows] = useState<T[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetcher(controller.signal)
      .then((list) => {
        setRows(list)
        setLoaded(true)
        setError(null)
      })
      .catch((cause) => {
        if (controller.signal.aborted) return
        setError(messageOf(cause, fallbackError))
      })
    return () => controller.abort()
  }, [fetcher, fallbackError, attempt])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  const retry = useCallback(() => {
    setError(null)
    setLoaded(false)
    setAttempt((value) => value + 1)
  }, [])

  return { rows, loading: !loaded && !error, error, reload, retry }
}
