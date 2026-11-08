import type { FormEvent } from 'react'
import type { EventDetail, Ticket } from '@/types/api'
import { Card, CardHead } from '@/components/ui/card'
import { Empty } from '@/components/ui/pill'
import { BookingForm } from '@/components/visitor/booking-form'
import { TicketCard } from '@/components/visitor/ticket-card'

type Props = {
  event: EventDetail | null
  slotLabel: string | null
  name: string
  ktp: boolean
  submitting: boolean
  nameInvalid: boolean
  formError: string | null
  activeTicket: Ticket | null
  tickets: Ticket[]
  onNameChange: (value: string) => void
  onKtpChange: (checked: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onSelectTicket: (code: string) => void
}

export function BookingPanel({
  event,
  slotLabel,
  name,
  ktp,
  submitting,
  nameInvalid,
  formError,
  activeTicket,
  tickets,
  onNameChange,
  onKtpChange,
  onSubmit,
  onSelectTicket,
}: Props) {
  return (
    <div className="grid content-start gap-4">
      {event ? (
        <Card>
          <CardHead title="Data penukar" meta={slotLabel ? `${event.place} · ${slotLabel}` : 'belum pilih jam'} />
          <BookingForm
            name={name}
            ktp={ktp}
            slotLabel={slotLabel}
            submitting={submitting}
            nameInvalid={nameInvalid}
            error={formError}
            onNameChange={onNameChange}
            onKtpChange={onKtpChange}
            onSubmit={onSubmit}
          />
        </Card>
      ) : null}
      {activeTicket ? (
        <TicketCard ticket={activeTicket} tickets={tickets} onSelect={onSelectTicket} />
      ) : (
        <Card>
          <CardHead title="Tiket kamu" />
          <Empty
            title="Belum ada tiket."
            hint="Pilih event dan jam datang, isi nama, lalu pesan. Kode dan QR muncul di sini."
          />
        </Card>
      )}
    </div>
  )
}
