import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, cancelTicket, createTicket, fetchMyTickets, fetchOpenEvent } from '@/lib/api'
import type { EventDetail, Ticket } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Card, CardHead } from '@/components/ui/card'
import { Empty } from '@/components/ui/pill'
import { useToast } from '@/components/ui/toast'
import { BookingForm } from '@/components/events/booking-form'
import { SlotGrid } from '@/components/events/slot-grid'
import { TicketCard } from '@/components/events/ticket-card'
import { EventsError, EventsLoading } from '@/components/events/event-states'

type LoadState = 'loading' | 'ready' | 'missing' | 'error'

export function EventPage() {
  const { eventId = '' } = useParams()
  const toast = useToast()

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [activeCode, setActiveCode] = useState<string | null>(null)
  const [slotStart, setSlotStart] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [ktp, setKtp] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const myTickets = useMemo(() => tickets.filter((ticket) => ticket.event.id === eventId), [tickets, eventId])
  const activeTicket = useMemo(
    () => myTickets.find((ticket) => ticket.code === activeCode) ?? myTickets[myTickets.length - 1] ?? null,
    [myTickets, activeCode],
  )
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

  const loadEvent = useCallback(async () => {
    setState('loading')
    setLoadError(null)
    try {
      setEvent(await fetchOpenEvent(eventId))
      setState('ready')
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) {
        setState('missing')
        return
      }
      setState('error')
      setLoadError(cause instanceof ApiError ? cause.message : 'Event gagal dimuat.')
    }
  }, [eventId])

  const refreshTickets = useCallback(async () => {
    try {
      setTickets(await fetchMyTickets())
    } catch {
      // tiket lokal tetap tampil sampai server bisa dihubungi lagi
    }
  }, [])

  useEffect(() => {
    void loadEvent()
  }, [loadEvent])

  useEffect(() => {
    void refreshTickets()
  }, [refreshTickets])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshTickets()
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [refreshTickets])

  function changeName(value: string) {
    setName(value)
    setFormError(null)
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.visitorName
      return next
    })
  }

  async function handleCancel(code: string) {
    if (cancelling) return
    setCancelling(true)
    try {
      const ticket = await cancelTicket(code)
      setTickets((prev) => prev.map((item) => (item.code === ticket.code ? ticket : item)))
      toast.show(`Tiket ${ticket.code} dibatalkan. Tempatnya kembali tersedia.`, 'ok')
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Tiket gagal dibatalkan. Coba lagi.')
      void refreshTickets()
    } finally {
      setCancelling(false)
      void loadEvent()
    }
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
      void loadEvent()
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFormError(cause.message)
        setFieldErrors(cause.field)
        toast.error(cause.message)
      } else {
        setFormError('Tiket gagal dipesan. Coba lagi.')
        toast.error('Tiket gagal dipesan. Coba lagi.')
      }
      void loadEvent()
    } finally {
      setSubmitting(false)
    }
  }

  if (state === 'loading') return <EventsLoading />

  if (state === 'missing') {
    return (
      <Card>
        <CardHead title="Event tidak ditemukan" />
        <Empty
          title="Event ini tidak sedang membuka penukaran."
          hint="Mungkin sudah tutup atau tautannya salah. Lihat event lain yang masih buka hari ini."
          action={
            <Link to="/events" className="mt-1 text-[13px] font-medium text-accent-ink hover:underline">
              Kembali ke daftar event
            </Link>
          }
        />
      </Card>
    )
  }

  if (state === 'error' || !event) {
    return <EventsError message={loadError} onRetry={() => void loadEvent()} />
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-2">
        <Link to="/events" className="w-fit text-[13px] font-medium text-muted hover:text-ink">
          Kembali ke daftar event
        </Link>
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">{event.name}</h1>
        <p className="max-w-[70ch] text-sm leading-5 text-muted">
          {event.place} <span aria-hidden="true">·</span>{' '}
          <span className="num">
            {event.openTime}-{event.closeTime}
          </span>{' '}
          <span aria-hidden="true">·</span> Bawa: {event.requirement}
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="grid content-start gap-4">
          <Card>
            <CardHead title="Jam datang" meta={`${event.slotMinutes} menit · kuota ${event.slotCapacity} orang`} />
            <SlotGrid
              slots={event.slots}
              selected={slotStart}
              quietStart={quietStart}
              invalid={Boolean(fieldErrors.slotStart)}
              onSelect={(start) => {
                setSlotStart(start)
                setFormError(null)
              }}
            />
            {fieldErrors.slotStart ? (
              <p className="mt-2 text-[13px] text-negative">{fieldErrors.slotStart}</p>
            ) : null}
            <p className="mt-3 text-xs leading-[18px] text-muted">
              Label "sepi" menandai slot terlonggar di antara empat slot berikutnya.
            </p>
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card>
            <CardHead
              title="Data penukar"
              meta={slotLabel ? `${event.place} · ${slotLabel}` : 'belum pilih jam'}
            />
            <BookingForm
              name={name}
              ktp={ktp}
              slotLabel={slotLabel}
              submitting={submitting}
              nameInvalid={Boolean(fieldErrors.visitorName)}
              error={formError}
              onNameChange={changeName}
              onKtpChange={(checked) => {
                setKtp(checked)
                setFormError(null)
              }}
              onSubmit={handleSubmit}
            />
          </Card>

          {activeTicket ? (
            <TicketCard
              ticket={activeTicket}
              tickets={myTickets}
              onSelect={setActiveCode}
              onCancel={handleCancel}
              cancelling={cancelling}
            />
          ) : (
            <Card>
              <CardHead title="Tiket kamu" />
              <Empty
                title="Belum ada tiket untuk event ini."
                hint="Pilih jam datang, isi nama sesuai KTP, lalu pesan. Kode dan QR muncul di sini."
              />
            </Card>
          )}
          <Button variant="ghost" className="w-full" onClick={() => void loadEvent()}>
            Muat ulang sisa kuota
          </Button>
        </div>
      </div>
    </section>
  )
}
