import { LinkButton } from '@/components/admin/shared/link-button'
import { Pill } from '@/components/ui/pill'
import { Select } from '@/components/ui/select'
import { Heading, Paragraph } from '@/components/ui/text'
import { todayLabel } from '@/lib/format'
import type { EventDetail, EventStatus } from '@/types/api'

// v1 punya status 'open'; sekarang namanya 'published'. Event selain yang
// tayang tetap bisa dipilih di sini, jadi statusnya ditulis supaya admin
// tidak mengira angka nol berarti event sepi.
const STATUS: Record<EventStatus, { label: string; tone: 'ok' | 'warn' | 'neutral' | 'bad' | 'brand' }> = {
  draft: { label: 'Draf', tone: 'neutral' },
  review: { label: 'Menunggu persetujuan', tone: 'warn' },
  published: { label: 'Tayang', tone: 'ok' },
  closed: { label: 'Selesai', tone: 'neutral' },
  cancelled: { label: 'Dibatalkan', tone: 'bad' },
}

type Props = {
  events: EventDetail[]
  eventId: string
  loading: boolean
  onSelect: (eventId: string) => void
}

export function DashboardHeader({ events, eventId, loading, onSelect }: Props) {
  const selected = events.find((event) => event.id === eventId)
  const status = selected ? STATUS[selected.status] : null

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1">
          <Heading level={1} id="dashboard-title">
            Dasbor mal
          </Heading>
          <Paragraph tone="muted">{todayLabel()}</Paragraph>
        </div>
        {/* Membuat event pindah ke editor penyelenggara; admin memakai editor yang sama. */}
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <LinkButton to="/manage/reviews" variant="ghost">
            Menunggu persetujuan
          </LinkButton>
          <LinkButton to="/manage/events/new">Buat event</LinkButton>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Select
          label="Event"
          className="sm:w-[360px]"
          value={eventId}
          options={events.map((event) => ({ value: event.id, label: `${event.name} · ${event.place}` }))}
          onChange={onSelect}
          placeholder={loading ? 'Memuat event...' : 'Belum ada event'}
          disabled={loading || events.length === 0}
        />
        {selected && status ? (
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <Pill tone={status.tone}>{status.label}</Pill>
            <span>
              {selected.place} · {selected.openTime}-{selected.closeTime}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
