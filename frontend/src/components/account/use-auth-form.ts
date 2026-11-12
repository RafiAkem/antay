import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import type { FieldErrors } from './auth-rules'
import { useCountdown } from './use-countdown'

// Penanganan galat yang sama untuk masuk, daftar, dan ubah profil: galat per
// isian tampil di bawah isiannya, galat umum jadi satu toast, dan 429 jadi
// hitung mundur yang mengunci tombol kirim.
export function useAuthForm<F extends string>(prefix: string, order: readonly F[]) {
  const toast = useToast()
  const [errors, setErrors] = useState<FieldErrors<F>>({})
  const [busy, setBusy] = useState(false)
  const wait = useCountdown()

  const inputId = (field: F) => `${prefix}-${field}`

  function focusFirst(next: FieldErrors<F>) {
    const first = order.find((field) => next[field] !== undefined)
    if (first) document.getElementById(inputId(first))?.focus()
  }

  // Dipanggil saat pengguna mengetik: tanda merah hilang begitu isiannya diubah.
  function clear(field: F) {
    setErrors((prev) => {
      if (prev[field] === undefined) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function reject(next: FieldErrors<F>): boolean {
    setErrors(next)
    focusFirst(next)
    return Object.keys(next).length > 0
  }

  // special memetakan kode galat yang punya tempat di isian tertentu,
  // misalnya EMAIL_TAKEN ke isian email.
  function fail(cause: unknown, special?: (error: ApiError) => FieldErrors<F> | null) {
    if (!(cause instanceof ApiError)) {
      toast.error('Permintaan gagal. Coba lagi sebentar lagi.')
      return
    }
    if (cause.status === 429 && cause.retryAfter) {
      wait.start(cause.retryAfter)
      return
    }
    const mapped = special?.(cause)
    if (mapped && reject(mapped)) return
    const fromServer: FieldErrors<F> = {}
    for (const field of order) {
      const issue = cause.field[field]
      if (issue) fromServer[field] = issue
    }
    // Server kadang menolak isian yang tidak kita kenal; jangan sampai galatnya hilang diam-diam.
    if (reject(fromServer)) return
    toast.error(cause.message)
  }

  async function run(task: () => Promise<void>, special?: (error: ApiError) => FieldErrors<F> | null) {
    if (busy || wait.remaining > 0) return
    setBusy(true)
    try {
      await task()
    } catch (cause) {
      fail(cause, special)
    } finally {
      setBusy(false)
    }
  }

  return { errors, busy, waitSeconds: wait.remaining, inputId, clear, reject, run }
}
