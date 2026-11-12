import { useState } from 'react'
import { ApiError } from '@/lib/api'
import { transitionEvent, type Transition } from '@/lib/manage-api'
import { useToast } from '@/components/ui/toast'
import { errorMessage } from './manage-labels'

export type IncompleteItem = { field: string; issue: string }

const DONE: Record<Transition, (name: string) => string> = {
  submissions: (name) => `${name} diajukan. Admin mal akan meninjaunya.`,
  approvals: (name) => `${name} disetujui dan sudah tayang.`,
  rejections: (name) => `${name} dikembalikan ke draf beserta alasannya.`,
  cancellations: (name) => `${name} dibatalkan.`,
  closures: (name) => `${name} ditutup.`,
}

// Satu tempat untuk ajukan, setujui, tolak, batal, dan tutup, dipakai editor
// dan antrean persetujuan. Setelah apa pun hasilnya, data dimuat ulang dari server.
export function useEventTransition(reload: () => void) {
  const toast = useToast()
  const [busy, setBusy] = useState<Transition | null>(null)
  const [incomplete, setIncomplete] = useState<IncompleteItem[]>([])

  async function run(event: { id: string; name: string }, transition: Transition, reason?: string): Promise<boolean> {
    setBusy(transition)
    setIncomplete([])
    try {
      await transitionEvent(event.id, transition, reason)
      toast.show(DONE[transition](event.name), 'ok')
      reload()
      return true
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'EVENT_INCOMPLETE') {
        const items = Object.entries(cause.field).map(([field, issue]) => ({ field, issue }))
        setIncomplete(items.length > 0 ? items : [{ field: 'event', issue: cause.message }])
        toast.error('Masih ada yang perlu dilengkapi sebelum event bisa diajukan.')
      } else if (cause instanceof ApiError && cause.status === 409) {
        // INVALID_STATUS: orang lain sudah memindahkan statusnya lebih dulu
        toast.error('Status event sudah berubah di tempat lain. Data dimuat ulang.')
        reload()
      } else {
        toast.error(errorMessage(cause, 'Perubahan status gagal. Coba lagi.'))
      }
      return false
    } finally {
      setBusy(null)
    }
  }

  return { busy, incomplete, clearIncomplete: () => setIncomplete([]), run }
}
