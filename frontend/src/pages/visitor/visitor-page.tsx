import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ApiError, createTicket, fetchMyTickets, fetchOpenEvents } from '@/lib/api'
import type { EventDetail, Ticket } from '@/types/api'
import { useToast } from '@/components/ui/toast'
import { EventPanel } from '@/components/visitor/event-panel'
import { EventsEmpty, EventsError, EventsLoading } from '@/components/visitor/visitor-states'
import { BookingPanel } from '@/components/visitor/booking-panel'

type LoadState = 'loading' | 'ready' | 'error'

export function VisitorPage() {
  const toast = useToast()
  const [events, setEvents] = useState<EventDetail[]>([])
  const [eventId, setEventId] = useState<string | null>(null)
  const [eventsState, setEventsState] = useState<LoadState>('loading')
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [slotStart, setSlotStart] = useState<string | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [activeCode, setActiveCode] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [ktp, setKtp] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const event = useMemo(() => events.find((item) => item.id === eventId) ?? null, [events, eventId])
  const activeTicket = useMemo(() => tickets.find((item) => item.code === activeCode) ?? null, [tickets, activeCode])
  const pickedSlot = event?.slots.find((slot) => slot.start === slotStart && !slot.past && slot.left > 0) ?? null
  const slotLabel = pickedSlot ? `${pickedSlot.start}-${pickedSlot.end}` : null

  const quietStart = useMemo(() => {
    if (!event) return null
    const upcoming = event.slots.filter((slot) => !slot.past && slot.left > 0).slice(0, 4)
    if (upcoming.length === 0) return null
    return upcoming.reduce((best, slot) =>
      slot.booked / slot.capacity < best.booked / best.capacity ? slot : best,
    ).start
  }, [event])

  const loadEvents = useCallback(async () => {
    setEventsState('loading')
    setEventsError(null)
    try {
      const list = await fetchOpenEvents()
      setEvents(list)
      setEventId((prev) => (prev && list.some((item) => item.id === prev) ? prev : (list[0]?.id ?? null)))
      setEventsState('ready')
    } catch (cause) {
      setEventsState('error')
      setEventsError(cause instanceof ApiError ? cause.message : 'Event hari ini gagal dimuat.')
    }
  }, [])

  const refreshEvents = useCallback(async () => {
    try {
      setEvents(await fetchOpenEvents())
    } catch {
      // data lama tetap dipakai, pengunjung bisa mencoba lagi
    }
  }, [])

  const refreshTickets = useCallback(async () => {
    try {
      const list = await fetchMyTickets()
      if (list.length === 0) return
      setTickets(list)
      setActiveCode((prev) =>
        prev && list.some((item) => item.code === prev) ? prev : (list[list.length - 1]?.code ?? null),
      )
    } catch {
      // tiket lokal tetap tampil sampai server bisa dihubungi lagi
    }
  }, [])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  useEffect(() => {
    void refreshTickets()
  }, [refreshTickets])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshTickets()
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [refreshTickets])

  function pickEvent(id: string) {
    setEventId(id)
    setSlotStart(null)
    setFormError(null)
    setFieldErrors({})
  }

  function pickSlot(start: string) {
    setSlotStart(start)
    setFormError(null)
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.slotStart
      return next
    })
  }

  function changeName(value: string) {
    setName(value)
    setFormError(null)
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.visitorName
      return next
    })
  }

  function changeKtp(checked: boolean) {
    setKtp(checked)
    setFormError(null)
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    if (!event || !pickedSlot || submitting) return
    const visitorName = name.trim().replace(/\s+/g, ' ')
    if (visitorName.length < 3) {
      setFieldErrors({ visitorName: 'Nama terlalu pendek.' })
      setFormError('Tulis nama lengkap sesuai KTP, minimal 3 karakter.')
      return
    }
    if (!ktp) {
      setFormError('Centang pernyataan KTP dulu sebelum memesan.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})
    try {
      const ticket = await createTicket({ eventId: event.id, slotStart: pickedSlot.start, visitorName })
      setTickets((prev) => [ticket, ...prev.filter((item) => item.code !== ticket.code)])
      setActiveCode(ticket.code)
      setName('')
      setKtp(false)
      setSlotStart(null)
      toast.show(`Slot dipesan. Kode tiket ${ticket.code}.`, 'ok')
      void refreshEvents()
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFormError(cause.message)
        setFieldErrors(cause.field)
        toast.error(cause.message)
      } else {
        setFormError('Tiket gagal dipesan. Coba lagi.')
        toast.error('Tiket gagal dipesan. Coba lagi.')
      }
      void refreshEvents()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="grid gap-5">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">Pesan jam tukar</h1>
        <p className="text-sm text-muted">Pilih event dan jam datang. Tunjukkan QR dan KTP di loket.</p>
      </header>

      {eventsState === 'loading' ? (
        <EventsLoading />
      ) : eventsState === 'error' ? (
        <EventsError message={eventsError} onRetry={() => void loadEvents()} />
      ) : events.length === 0 ? (
        <EventsEmpty />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <EventPanel
            events={events}
            event={event}
            selectedId={eventId}
            selectedSlot={pickedSlot?.start ?? null}
            quietStart={quietStart}
            slotError={fieldErrors.slotStart ?? null}
            onPickEvent={pickEvent}
            onPickSlot={pickSlot}
          />
          <BookingPanel
            event={event}
            slotLabel={slotLabel}
            name={name}
            ktp={ktp}
            submitting={submitting}
            nameInvalid={Boolean(fieldErrors.visitorName)}
            formError={formError}
            activeTicket={activeTicket}
            tickets={tickets}
            onNameChange={changeName}
            onKtpChange={changeKtp}
            onSubmit={handleSubmit}
            onSelectTicket={setActiveCode}
          />
        </div>
      )}
    </section>
  )
}
