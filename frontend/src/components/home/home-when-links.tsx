import { Link } from 'react-router-dom'
import { WHEN_OPTIONS, matchesWhen, jakartaToday } from '@/components/events/list/event-dates'
import type { CatalogEvent } from '@/types/catalog'

type HomeWhenLinksProps = {
  // Sudah disaring ke event yang akan datang.
  events: CatalogEvent[]
}

// Bentuknya meniru Chip, tapi ini tautan pindah halaman, bukan tombol toggle,
// jadi tidak bisa memakai Chip (yang selalu memasang aria-pressed).
const CHIP_LINK =
  'inline-flex h-9 flex-none items-center gap-1.5 rounded-pill border border-border-soft bg-surface px-3.5 text-[13px] font-semibold whitespace-nowrap text-ink transition-colors hover:border-control'

export function HomeWhenLinks({ events }: HomeWhenLinksProps) {
  const today = jakartaToday()
  const links = WHEN_OPTIONS.map((option) => ({
    ...option,
    count: events.filter((event) => matchesWhen(event.eventDate, option.value, today)).length,
  }))
    // Chip yang isinya kosong cuma bikin orang mengetuk lalu kecewa.
    .filter((option) => option.value === 'all' || option.count > 0)

  return (
    <nav aria-label="Event menurut tanggal">
      <ul className="-mx-gutter flex gap-2 overflow-x-auto px-gutter [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
        {links.map((option) => (
          <li key={option.value} className="flex-none">
            <Link to={option.value === 'all' ? '/events' : `/events?when=${option.value}`} className={CHIP_LINK}>
              {option.label}
              <span className="num font-normal text-muted">
                {option.count}
                <span className="sr-only"> event</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
