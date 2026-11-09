import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  footer?: ReactNode
  children?: ReactNode
  width?: 'md' | 'lg'
}

export function Modal({ open, title, description, onClose, footer, children, width = 'md' }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${width === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md'} rounded-t-xl border border-border-soft bg-surface p-5 shadow-xl sm:rounded-[var(--radius-card)]`}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold leading-6">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-7 w-7 place-items-center rounded-[var(--radius-control)] text-muted hover:bg-raised"
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
