import { cn } from '@/components/ui/cn'

type Props = {
  value: number
  min?: number
  max?: number
  disabled?: boolean
  busy?: boolean
  onChange: (value: number) => void
  decreaseLabel: string
  increaseLabel: string
  // compact menyamakan tinggi dengan Select (40px) saat berdiri sejajar di satu baris.
  compact?: boolean
}

// Tampilannya mengikuti Stepper di components/ui, tapi versi loket butuh
// disabled dan busy: jumlah loket dikunci selama perubahan sebelumnya masih
// dikirim, supaya dua ketukan cepat tidak saling menimpa di server.
// Tombolnya 40px karena dipakai sambil berdiri di meja, sering dengan satu tangan.
const BUTTON =
  'grid flex-none place-items-center rounded-control text-accent-ink transition-colors hover:bg-tint-100 disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent'

export function Stepper({
  value,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  disabled,
  busy,
  onChange,
  decreaseLabel,
  increaseLabel,
  compact = false,
}: Props) {
  const locked = disabled || busy
  const button = cn(BUTTON, compact ? 'h-8 w-9' : 'h-10 w-10')

  return (
    <div
      aria-busy={busy || undefined}
      className={cn('inline-flex flex-none items-center gap-1 rounded-control bg-tint-50 p-1', compact ? 'h-10' : 'h-12')}
    >
      <button
        type="button"
        aria-label={decreaseLabel}
        disabled={locked || value <= min}
        onClick={() => onChange(value - 1)}
        className={button}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M3 7h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <output aria-live="polite" className={cn('num min-w-10 text-center text-base font-bold', busy ? 'text-muted' : 'text-ink')}>
        {value}
      </output>
      <button
        type="button"
        aria-label={increaseLabel}
        disabled={locked || value >= max}
        onClick={() => onChange(value + 1)}
        className={button}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M3 7h8M7 3v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
