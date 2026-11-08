import type { InputHTMLAttributes, ReactNode } from 'react'

type FieldProps = {
  label: string
  hint?: string
  error?: boolean
  children: ReactNode
  className?: string
}

export function Field({ label, hint, error, children, className = '' }: FieldProps) {
  return (
    <label className={`grid gap-2 text-sm font-medium ${className}`}>
      <span>{label}</span>
      {children}
      {hint ? <span className="text-[13px] font-normal leading-[19px] text-muted">{hint}</span> : null}
      {error ? <span className="text-[13px] font-normal text-negative">Periksa isian ini.</span> : null}
    </label>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { error?: boolean }

export function Input({ error, className = '', ...rest }: InputProps) {
  return (
    <input
      aria-invalid={error || undefined}
      className={`h-[38px] w-full rounded-[var(--radius-control)] border bg-surface px-3 text-sm placeholder:text-faint ${
        error ? 'border-negative' : 'border-border-soft'
      } ${className}`}
      {...rest}
    />
  )
}

export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-[18px] w-[18px] flex-none accent-accent"
      />
      <span>{children}</span>
    </label>
  )
}
