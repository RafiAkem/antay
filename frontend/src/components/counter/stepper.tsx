type Props = {
  value: number
  min?: number
  max?: number
  disabled?: boolean
  busy?: boolean
  onChange: (value: number) => void
  decreaseLabel: string
  increaseLabel: string
}

export function Stepper({
  value,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  disabled,
  busy,
  onChange,
  decreaseLabel,
  increaseLabel,
}: Props) {
  const locked = disabled || busy
  const button =
    'grid h-[38px] w-9 flex-none place-items-center rounded-[var(--radius-control)] border border-control bg-surface text-lg font-semibold hover:bg-raised disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted'

  return (
    <div className="inline-flex items-center gap-1">
      <button type="button" aria-label={decreaseLabel} disabled={locked || value <= min} onClick={() => onChange(value - 1)} className={button}>
        −
      </button>
      <output className="num min-w-12 text-center text-sm font-semibold" aria-live="polite">
        {value}
      </output>
      <button type="button" aria-label={increaseLabel} disabled={locked || value >= max} onClick={() => onChange(value + 1)} className={button}>
        +
      </button>
    </div>
  )
}
