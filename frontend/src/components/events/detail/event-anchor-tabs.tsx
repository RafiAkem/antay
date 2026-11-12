import type { MouseEvent } from 'react'
import { cn } from '@/components/ui/cn'
import { DETAIL_TABS } from './event-detail-labels'

type Props = {
  active: string
  onPick: (id: string) => void
}

// Tab jangkar, bukan tab yang menyembunyikan isi: semua bagian tetap ada di
// halaman, tab hanya melompat ke sana. Menempel tepat di bawah header publik.
export function EventAnchorTabs({ active, onPick }: Props) {
  function jump(event: MouseEvent<HTMLAnchorElement>, id: string) {
    const target = document.getElementById(id)
    if (!target) return
    event.preventDefault()
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
    // replaceState, bukan pushState: tombol kembali tetap keluar dari halaman,
    // bukan mundur satu tab demi satu tab.
    window.history.replaceState(window.history.state, '', `#${id}`)
    onPick(id)
  }

  return (
    <nav
      aria-label="Bagian halaman event"
      className="sticky top-header z-10 -mx-gutter border-b border-border-soft bg-ground px-gutter lg:mx-0 lg:px-0"
    >
      <ul className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {DETAIL_TABS.map((tab) => {
          const current = tab.id === active
          return (
            <li key={tab.id} className="flex-none">
              <a
                href={`#${tab.id}`}
                aria-current={current ? 'location' : undefined}
                onClick={(event) => jump(event, tab.id)}
                className={cn(
                  'flex h-12 items-center border-b-2 px-3 text-sm font-semibold transition-colors',
                  current ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink',
                )}
              >
                {tab.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
