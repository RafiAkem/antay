import { useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './cn'
import { useOverlay } from './use-overlay'

type Props = {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  footer?: ReactNode
  children?: ReactNode
  width?: 'md' | 'lg'
}

// Modal untuk konfirmasi singkat. Untuk alur panjang (pilih tiket, checkout)
// pakai Sheet, yang di ponsel jadi bottom sheet penuh.
export function Modal({ open, title, description, onClose, footer, children, width = 'md' }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  useOverlay(open, onClose, panelRef)

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-night/50 p-0 motion-safe:animate-fade-in sm:items-center sm:p-6">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'w-full rounded-t-sheet bg-surface p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] shadow-lg outline-none sm:rounded-card sm:pb-5',
          width === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-lg leading-6 font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 flex-none place-items-center rounded-control text-muted hover:bg-raised hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {description ? <p className="mb-4 text-sm leading-[21px] text-muted">{description}</p> : null}
        {children}
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
