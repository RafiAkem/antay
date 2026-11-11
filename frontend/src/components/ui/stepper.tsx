import { cn } from './cn'

type StepperProps = {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
  label: string
  className?: string
}

const STEP_BUTTON =
  'grid h-8 w-8 place-items-center rounded-control text-accent-ink transition-colors hover:bg-tint-100 disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent'

// label wajib karena satu baris paket bisa punya beberapa stepper; tanpa nama,
// pembaca layar hanya mendengar "Tambah" tanpa tahu tambah apa.
export function Stepper({ value, min = 0, max = Number.POSITIVE_INFINITY, onChange, label, className }: StepperProps) {
  const canDecrease = value > min
  const canIncrease = value < max

  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex h-10 flex-none items-center gap-1 rounded-control bg-tint-50 p-1', className)}
    >
      <button
        type="button"
        aria-label={`Kurangi ${label}`}
        disabled={!canDecrease}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={STEP_BUTTON}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M3 7h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <output aria-live="polite" className="num min-w-6 text-center text-[15px] font-bold text-ink">
        {value}
      </output>
      <button
        type="button"
        aria-label={`Tambah ${label}`}
        disabled={!canIncrease}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={STEP_BUTTON}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M3 7h8M7 3v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
