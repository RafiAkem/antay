import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useToast } from '@/components/ui/toast'
import {
  ApiError,
  fetchStaffEvents,
  fetchWaiting,
  lookupTicket,
  redeemTicket,
  updateQueue,
} from '@/lib/api'
import type { EventDetail, Ticket } from '@/types/api'
import { normalizeCode } from './code'
import type { LookupResult } from './ticket-lookup'

export function useTicketDesk() {
  const { show } = useToast()
  const [events, setEvents] = useState<EventDetail[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [eventId, setEventId] = useState('')
  const [counter, setCounter] = useState(1)
  const [counterBusy, setCounterBusy] = useState(false)

  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [result, setResult] = useState<LookupResult | null>(null)
  const [lookupError, setLookupError] = useState<ApiError | null>(null)
  const [ktpChecked, setKtpChecked] = useState(false)

  const [waiting, setWaiting] = useState<Ticket[]>([])
  const [waitingSlots, setWaitingSlots] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [waitingDraft, setWaitingDraft] = useState(0)

  const event = events.find((item) => item.id === eventId) ?? null

  const applyEvent = useCallback((updated: EventDetail) => {
    setEvents((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
  }, [])

  const loadEvents = useCallback(() => {
    setEventsLoading(true)
    setEventsError(null)
    fetchStaffEvents()
      .then((list) => {
        setEvents(list)
        setEventId((prev) => (prev && list.some((item) => item.id === prev) ? prev : (list[0]?.id ?? '')))
      })
      .catch((cause) => {
        setEventsError(cause instanceof ApiError ? cause.message : 'Gagal memuat daftar event.')
      })
      .finally(() => setEventsLoading(false))
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  useEffect(() => {
    setResult(null)
    setLookupError(null)
    setKtpChecked(false)
    setSearch('')
  }, [eventId])

  useEffect(() => {
    if (!event) return
    setCounter((prev) => Math.min(Math.max(1, prev), Math.max(1, event.counterCount)))
    setWaitingDraft(event.waitingCount)
  }, [event])

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

  const refreshWaiting = useCallback((id: string) => {
    return fetchWaiting(id)
      .then((data) => {
        setWaiting(data.tickets)
        setWaitingSlots(data.slots)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!eventId) {
      setWaiting([])
      setWaitingSlots([])
      return
    }
    void refreshWaiting(eventId)
    const timer = window.setInterval(() => {
      if (!document.hidden) void refreshWaiting(eventId)
    }, 20000)
    const onVisible = () => {
      if (!document.hidden) void refreshWaiting(eventId)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [eventId, refreshWaiting])

  function focusCode() {
    document.getElementById('ticket-code')?.focus()
  }

  function resetLookup() {
    setResult(null)
    setLookupError(null)
    setKtpChecked(false)
  }

  async function handleCountersChange(next: number) {
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
      await redeemTicket(result.ticket.code, { eventId: event.id, counter, ktpChecked: true })
      show(`${result.ticket.visitorName} menerima ${event.item} di loket ${counter}.`, 'ok')
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

  function handleCancel() {
    resetLookup()
    focusCode()
  }

  function handlePick(picked: string) {
    setCode(picked)
    resetLookup()
    focusCode()
  }

  return {
    events,
    eventsLoading,
    eventsError,
    event,
    counter,
    counterBusy,
    code,
    checking,
    redeeming,
    result,
    lookupError,
    ktpChecked,
    waiting,
    waitingSlots,
    search,
    waitingDraft,
    loadEvents,
    setEventId,
    setCounter,
    setSearch,
    setWaitingDraft,
    onCodeChange: (value: string) => setCode(normalizeCode(value)),
    onKtpChange: setKtpChecked,
    onCountersChange: handleCountersChange,
    onCheck: handleCheck,
    onRedeem: handleRedeem,
    onCancel: handleCancel,
    onPick: handlePick,
  }
}
