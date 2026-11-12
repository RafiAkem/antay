import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './cn'
import { useOverlay } from './use-overlay'

type SheetProps = {
  open: boolean
  onClose: () => void
  title: string
  footer?: ReactNode
  className?: string
  children: ReactNode
}

// Satu komponen, dua bentuk: bottom sheet di bawah 1024px, panel kanan di desktop.
// Bentuknya diatur CSS saja, jadi tidak ada matchMedia yang bisa telat sekejap
// dan membuat panel melompat saat pertama dibuka.
// Gagang di atas hanya penanda visual; menutup lewat tombol, Esc, atau ketuk latar.
export function Sheet({ open, onClose, title, footer, className, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useOverlay(open, onClose, panelRef)

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-40">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-night/50 motion-safe:animate-fade-in" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-sheet bg-surface outline-none',
          'motion-safe:animate-sheet-up',
          'lg:inset-y-0 lg:left-auto lg:max-h-none lg:w-[min(440px,100vw)] lg:rounded-none lg:border-l lg:border-border-soft',
          'lg:motion-safe:animate-sheet-side',
          className,
        )}
      >
        <div aria-hidden="true" className="flex justify-center pt-2 lg:hidden">
          <span className="h-1 w-9 rounded-pill bg-control" />
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border-soft px-4 pt-2 pb-3 lg:pt-4">
          <h2 id={titleId} className="text-base leading-6 font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 flex-none place-items-center rounded-control text-muted hover:bg-raised hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-border-soft px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
