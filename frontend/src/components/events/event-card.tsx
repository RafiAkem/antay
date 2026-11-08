import { Link } from 'react-router-dom'
import { Pill } from '@/components/ui/pill'
import { percent, slotRange } from '@/lib/format'
import type { EventDetail } from '@/types/api'

type Props = {
  event: EventDetail
}

// Satu card = satu event. Seluruh card adalah tautan supaya di ponsel mudah ditekan.
export function EventCard({ event }: Props) {
  const capacity = event.slots.reduce((sum, slot) => sum + slot.capacity, 0)
  const booked = event.slots.reduce((sum, slot) => sum + slot.booked, 0)
  const remaining = event.slots.filter((slot) => !slot.past && slot.left > 0)
  const next = remaining[0] ?? null

  // "Kuota habis" dan "sudah lewat" beda arti bagi pengunjung: yang pertama
  // masih bisa dicoba besok, yang kedua tidak ada gunanya dibuka lagi hari ini.
  const badge = !event.slots.some((slot) => !slot.past) ? (
    <Pill tone="neutral">Selesai hari ini</Pill>
  ) : event.leftTotal > 0 ? (
    <Pill tone="brand">{event.leftTotal} sisa kuota</Pill>
  ) : (
    <Pill tone="bad">Kuota habis</Pill>
  )

  return (
    <Link
      to={`/events/${event.id}`}
      className="group grid min-w-0 content-between gap-4 rounded-[var(--radius-card)] border border-border-soft bg-surface p-5 transition-colors hover:border-control"
    >
      <div className="grid gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="min-w-0 text-lg font-semibold leading-6 tracking-[-0.01em] group-hover:text-accent-ink">
            {event.name}
          </h2>
          {badge}
        </div>
        <p className="text-[13px] text-muted">
          {event.place} <span aria-hidden="true">·</span>{' '}
          <span className="num">
            {event.openTime}-{event.closeTime}
          </span>
        </p>
        <p className="text-[13px] leading-5 text-muted">Ditukar dengan {event.item.toLowerCase()}.</p>
      </div>

      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3 text-xs text-muted">
          <span>
            {next
              ? `Slot kosong berikutnya ${slotRange(next.start, next.end)}`
              : event.slots.some((slot) => !slot.past)
                ? 'Semua slot hari ini penuh'
                : 'Tidak ada slot tersisa hari ini'}
          </span>
          <span className="num">{percent(booked, capacity)}% terisi</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-tint-100" aria-hidden="true">
          <div className="h-full rounded-full bg-accent" style={{ width: `${percent(booked, capacity)}%` }} />
        </div>
        <span className="text-[13px] font-medium text-accent-ink">Pilih jam datang</span>
      </div>
    </Link>
  )
}
