import { Children, useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from './cn'
import { Heading } from './text'

type CarouselProps = {
  title: string
  action?: ReactNode
  className?: string
  children: ReactNode
}

// Lebar item meniru grid kartu: 2 lebih sedikit di ponsel (ujung kartu ketiga
// mengintip supaya orang tahu barisnya bisa digeser), 3 lebih sedikit di tablet,
// pas 4 di desktop. Angka 12px/16px di sini harus sama dengan gap di track.
const ITEM =
  'w-[calc((100%-24px)/2.15)] flex-none snap-start sm:w-[calc((100%-36px)/3.2)] lg:w-[calc((100%-48px)/4)]'

const ARROW =
  'grid h-9 w-9 place-items-center rounded-pill border border-border-soft bg-surface text-ink transition-colors hover:border-control disabled:cursor-not-allowed disabled:text-faint disabled:hover:border-border-soft'

export function Carousel({ title, action, className, children }: CarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null)
  const headingId = useId()
  const [edges, setEdges] = useState({ start: true, end: true })

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const max = track.scrollWidth - track.clientWidth
    setEdges({ start: track.scrollLeft <= 4, end: track.scrollLeft >= max - 4 })
  }, [])

  // ResizeObserver langsung memanggil measure sekali saat mulai mengamati,
  // jadi tidak perlu pengukuran sinkron di dalam efek.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    return () => observer.disconnect()
  }, [measure])

  function scroll(direction: 1 | -1) {
    const track = trackRef.current
    if (!track) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: calm ? 'auto' : 'smooth' })
  }

  return (
    <div role="region" aria-labelledby={headingId} className={cn('grid gap-3', className)}>
      <div className="flex items-end justify-between gap-3">
        <Heading level={2} size="lg" id={headingId}>
          {title}
        </Heading>
        <div className="flex flex-none items-center gap-3">
          {action}
          <div className="hidden gap-2 lg:flex">
            <button type="button" aria-label="Geser ke kiri" disabled={edges.start} onClick={() => scroll(-1)} className={ARROW}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M8.5 3 4.5 7l4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <button type="button" aria-label="Geser ke kanan" disabled={edges.end} onClick={() => scroll(1)} className={ARROW}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M5.5 3l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {/* Di ponsel track menembus gutter Container supaya kartu bisa digeser
          sampai tepi layar, lalu scroll-padding mengembalikan titik snap ke gutter. */}
      <ul
        ref={trackRef}
        onScroll={measure}
        className="-mx-gutter flex snap-x snap-mandatory scroll-px-gutter gap-3 overflow-x-auto overscroll-x-contain px-gutter pb-1 [scrollbar-width:none] lg:mx-0 lg:scroll-px-0 lg:gap-4 lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {Children.map(children, (child) => (
          <li className={ITEM}>{child}</li>
        ))}
      </ul>
    </div>
  )
}
