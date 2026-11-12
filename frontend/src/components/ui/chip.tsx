import type { ReactNode } from 'react'
import { cn } from './cn'

type ChipProps = {
  selected?: boolean
  onClick?: () => void
  icon?: ReactNode
  disabled?: boolean
  className?: string
  children: ReactNode
}

// Chip filter berperilaku seperti tombol toggle, jadi status terpilihnya
// dibacakan lewat aria-pressed, bukan cuma lewat warna.
export function Chip({ selected = false, onClick, icon, disabled, className, children }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-9 flex-none items-center gap-1.5 rounded-pill border px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'border-accent bg-tint-100 text-accent-ink'
          : 'border-border-soft bg-surface text-ink hover:border-control',
        className,
      )}
    >
      {icon ? (
        <span aria-hidden="true" className="flex-none">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  )
}
