import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { ApiError, cancelTicket, fetchMyTickets } from '@/lib/api'
import { listTicketsByCode } from '@/lib/visitor-storage'
import type { Ticket } from '@/types/api'

// Tiket penukaran versi 1 disimpan per perangkat, bukan per akun. Kalau
// perangkat ini tidak menyimpan kode apa pun, tidak ada yang perlu diambil
// dan bagiannya tidak pernah muncul (tanpa skeleton yang berkedip).
export function useLegacyTickets() {
  const toast = useToast()
  const [hasSaved] = useState(() => listTicketsByCode().length > 0)
  const [tickets, setTickets] = useState<Ticket[] | null>(hasSaved ? null : [])
  const [cancelling, setCancelling] = useState(false)
  // Hasil muat yang datang terlambat tidak boleh menimpa hasil pembatalan yang lebih baru.
  const version = useRef(0)

  const load = useCallback(async () => {
    const current = ++version.current
    try {
      const next = await fetchMyTickets()
      if (current === version.current) setTickets(next)
    } catch {
      if (current === version.current) setTickets((prev) => prev ?? [])
    }
  }, [])

  useEffect(() => {
    if (!hasSaved) return
    const current = ++version.current
    fetchMyTickets().then(
      (next) => {
        if (current === version.current) setTickets(next)
      },
      () => {
        if (current === version.current) setTickets([])
      },
    )
  }, [hasSaved])

  async function cancel(code: string) {
    if (cancelling) return
    setCancelling(true)
    try {
      const ticket = await cancelTicket(code)
      version.current++
      setTickets((prev) => (prev ?? []).map((item) => (item.code === ticket.code ? ticket : item)))
      toast.show(`Tiket ${ticket.code} dibatalkan. Tempatnya kembali tersedia.`, 'ok')
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Tiket gagal dibatalkan. Coba lagi.')
      void load()
    } finally {
      setCancelling(false)
    }
  }

  return { tickets, cancelling, cancel }
}
