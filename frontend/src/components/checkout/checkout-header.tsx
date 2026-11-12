import { Link } from 'react-router-dom'
import { clockLabel, eventDateLabel } from '@/components/events/detail/event-format'
import { EventGlyph } from '@/components/events/detail/event-glyph'
import { cn } from '@/components/ui/cn'
import { Container } from '@/components/ui/container'
import { Heading } from '@/components/ui/text'
import type { CatalogEventDetail } from '@/types/catalog'
import { STEP_TITLES, stepProgress } from './checkout-labels'
import type { CheckoutStep } from './checkout-state'

type CheckoutHeaderProps = {
  event: CatalogEventDetail
  steps: CheckoutStep[]
  step: CheckoutStep
  onBack: () => void
  onGoTo: (step: CheckoutStep) => void
}

const BACK_CLASS =
  'grid h-10 w-10 flex-none place-items-center rounded-control border border-border-soft bg-surface text-ink transition-colors hover:bg-raised'

// Header ringkas: di ponsel cuma tombol kembali, nama event, tanggal, dan
// posisi langkah. Daftar langkah lengkap baru muncul di desktop.
export function CheckoutHeader({ event, steps, step, onBack, onGoTo }: CheckoutHeaderProps) {
  const index = steps.indexOf(step)
  const eventHref = `/events/${encodeURIComponent(event.id)}`
  const glyph = <EventGlyph name="arrow" className="rotate-180" />

  return (
    <div className="border-b border-border-soft bg-surface">
      <Container className="grid gap-3 py-3 lg:py-4">
        <div className="flex items-center gap-3">
          {index > 0 ? (
            <button type="button" onClick={onBack} aria-label={`Kembali ke langkah ${STEP_TITLES[steps[index - 1]]}`} className={BACK_CLASS}>
              {glyph}
            </button>
          ) : (
            <Link to={eventHref} aria-label="Kembali ke halaman event" className={BACK_CLASS}>
              {glyph}
            </Link>
          )}
          <div className="grid min-w-0 gap-0.5">
            <Heading level={1} size="md" className="truncate">
              <Link to={eventHref} className="hover:underline">
                {event.name}
              </Link>
            </Heading>
            <p className="truncate text-xs text-muted">
              {eventDateLabel(event.eventDate)} · {clockLabel(event.openTime)}
            </p>
          </div>
        </div>

        <p className="text-[13px] lg:hidden">
          <span className="font-semibold">{stepProgress(steps, step)}</span>
          <span className="text-muted"> · {STEP_TITLES[step]}</span>
        </p>

        <ol aria-label="Langkah checkout" className="hidden items-center gap-2 lg:flex">
          {steps.map((item, position) => {
            const done = position < index
            const current = position === index
            const content = (
              <>
                <span className={cn('num grid h-5 w-5 place-items-center rounded-pill text-[11px] font-bold', current || done ? 'bg-accent text-white' : 'bg-raised text-muted')}>
                  {position + 1}
                </span>
                {STEP_TITLES[item]}
              </>
            )
            return (
              <li key={item} className="flex items-center gap-2">
                {position > 0 ? <span aria-hidden="true" className="h-px w-6 bg-border-soft" /> : null}
                {done ? (
                  <button type="button" onClick={() => onGoTo(item)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink hover:underline">
                    {content}
                  </button>
                ) : (
                  <span aria-current={current ? 'step' : undefined} className={cn('inline-flex items-center gap-1.5 text-[13px]', current ? 'font-bold text-ink' : 'text-muted')}>
                    {content}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </Container>
    </div>
  )
}
