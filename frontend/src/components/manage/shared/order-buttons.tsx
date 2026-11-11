type OrderButtonsProps = {
  label: string
  first: boolean
  last: boolean
  disabled?: boolean
  onMove: (direction: -1 | 1) => void
}

const BUTTON =
  'grid h-8 w-8 place-items-center rounded-control border border-border-soft bg-surface text-muted hover:border-control hover:text-ink disabled:cursor-not-allowed disabled:opacity-40'

// Tombol naik/turun, bukan seret: bisa dipakai dengan jempol dan keyboard,
// dan setiap klik langsung jadi satu perubahan urutan yang jelas.
export function OrderButtons({ label, first, last, disabled, onMove }: OrderButtonsProps) {
  return (
    <span className="inline-flex gap-1">
      <button type="button" className={BUTTON} disabled={disabled || first} onClick={() => onMove(-1)} aria-label={`Naikkan ${label}`}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 7.5 6 3.5l4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <button type="button" className={BUTTON} disabled={disabled || last} onClick={() => onMove(1)} aria-label={`Turunkan ${label}`}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 4.5 6 8.5l4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </span>
  )
}

export function TextAction({
  children,
  tone = 'default',
  disabled,
  onClick,
  label,
}: {
  children: string
  tone?: 'default' | 'danger'
  disabled?: boolean
  onClick: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`h-8 rounded-control px-2 text-[13px] font-semibold hover:bg-raised disabled:cursor-not-allowed disabled:opacity-40 ${
        tone === 'danger' ? 'text-negative' : 'text-accent'
      }`}
    >
      {children}
    </button>
  )
}
