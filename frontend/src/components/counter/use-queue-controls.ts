import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { ApiError, updateQueue } from '@/lib/api'
import type { EventDetail } from '@/types/api'

// Loket yang dipegang petugas, jumlah loket buka, dan koreksi antrean manual.
export function useQueueControls(event: EventDetail | null, applyEvent: (updated: EventDetail) => void) {
  const { show } = useToast()
  const [counter, setCounter] = useState(1)
  const [counterBusy, setCounterBusy] = useState(false)
  const [waitingDraft, setWaitingDraft] = useState(0)

  useEffect(() => {
    if (!event) return
    setCounter((prev) => Math.min(Math.max(1, prev), Math.max(1, event.counterCount)))
    setWaitingDraft(event.waitingCount)
  }, [event])

  // Stepper antrean bisa ditekan cepat berkali-kali. Tunggu setengah detik
  // setelah ketukan terakhir supaya yang terkirim cuma angka akhirnya.
  useEffect(() => {
    if (!event || waitingDraft === event.waitingCount) return
    const id = event.id
    const timer = window.setTimeout(() => {
      updateQueue(id, { waitingCount: waitingDraft })
        .then(applyEvent)
        .catch((cause) => {
          show(cause instanceof ApiError ? cause.message : 'Gagal menyimpan antrean.', 'error')
          setWaitingDraft(event.waitingCount)
        })
    }, 500)
    return () => window.clearTimeout(timer)
  }, [event, waitingDraft, applyEvent, show])

  async function changeCounters(next: number) {
    if (!event || counterBusy) return
    setCounterBusy(true)
    try {
      applyEvent(await updateQueue(event.id, { counterCount: next }))
    } catch (cause) {
      show(cause instanceof ApiError ? cause.message : 'Gagal mengubah jumlah loket.', 'error')
    } finally {
      setCounterBusy(false)
    }
  }

  return { counter, setCounter, counterBusy, waitingDraft, setWaitingDraft, changeCounters }
}
