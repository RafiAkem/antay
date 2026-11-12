import { useEffect, useState, type FormEvent } from 'react'
import { useToast } from '@/components/ui/toast'
import { ApiError, lookupTicket, redeemTicket } from '@/lib/api'
import { normalizeCode } from './code'
import type { LookupResult } from './ticket-lookup'
import { useDeskEvents } from './use-desk-events'
import { useQueueControls } from './use-queue-controls'
import { useWaitingTickets } from './use-waiting-tickets'

// Hook utama loket: merangkai event, antrean, daftar menunggu, lalu mengurus
// sendiri alur cek kode dan serah item.
export function useTicketDesk() {
  const { show } = useToast()
  const desk = useDeskEvents()
  const { event, eventId } = desk
  const queue = useQueueControls(event, desk.applyEvent)
  const { waiting, waitingSlots, refreshWaiting } = useWaitingTickets(eventId)

  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [result, setResult] = useState<LookupResult | null>(null)
  const [lookupError, setLookupError] = useState<ApiError | null>(null)
  const [ktpChecked, setKtpChecked] = useState(false)
  const [search, setSearch] = useState('')

  // Ganti event berarti hasil cek tiket sebelumnya tidak berlaku lagi.
  useEffect(() => {
    setResult(null)
    setLookupError(null)
    setKtpChecked(false)
    setSearch('')
  }, [eventId])

  function focusCode() {
    document.getElementById('ticket-code')?.focus()
  }

  function resetLookup() {
    setResult(null)
    setLookupError(null)
    setKtpChecked(false)
  }

  async function handleCheck(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    if (!event || checking) return
    const value = normalizeCode(code)
    if (!value) return
    setCode(value)
    setChecking(true)
    resetLookup()
    try {
      setResult(await lookupTicket(value, event.id))
    } catch (cause) {
      setLookupError(cause instanceof ApiError ? cause : new ApiError('Gagal memeriksa tiket.', 0))
    } finally {
      setChecking(false)
    }
  }

  async function handleRedeem() {
    if (!result || !event || redeeming) return
    setRedeeming(true)
    setLookupError(null)
    try {
      await redeemTicket(result.ticket.code, { eventId: event.id, counter: queue.counter, ktpChecked: true })
      show(`${result.ticket.visitorName} menerima ${event.item} di loket ${queue.counter}.`, 'ok')
      setResult(null)
      setCode('')
      setKtpChecked(false)
      void refreshWaiting(event.id)
      focusCode()
    } catch (cause) {
      setResult(null)
      setLookupError(cause instanceof ApiError ? cause : new ApiError('Gagal menukar tiket.', 0))
    } finally {
      setRedeeming(false)
    }
  }

  return {
    events: desk.events,
    eventsLoading: desk.eventsLoading,
    eventsError: desk.eventsError,
    event,
    counter: queue.counter,
    counterBusy: queue.counterBusy,
    code,
    checking,
    redeeming,
    result,
    lookupError,
    ktpChecked,
    waiting,
    waitingSlots,
    search,
    waitingDraft: queue.waitingDraft,
    loadEvents: desk.loadEvents,
    setEventId: desk.setEventId,
    setCounter: queue.setCounter,
    setSearch,
    setWaitingDraft: queue.setWaitingDraft,
    onCodeChange: (value: string) => setCode(normalizeCode(value)),
    onKtpChange: setKtpChecked,
    onCountersChange: queue.changeCounters,
    onCheck: handleCheck,
    onRedeem: handleRedeem,
    onCancel: () => {
      resetLookup()
      focusCode()
    },
    onPick: (picked: string) => {
      setCode(picked)
      resetLookup()
      focusCode()
    },
  }
}
