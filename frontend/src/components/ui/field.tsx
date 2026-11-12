import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

type FieldProps = {
  label: string
  hint?: string
  error?: boolean
  children: ReactNode
  className?: string
}

export function Field({ label, hint, error, children, className = '' }: FieldProps) {
  return (
    <label className={cn('grid gap-1.5 text-[13px] font-semibold', className)}>
      <span>{label}</span>
      {children}
      {hint ? <span className="text-[13px] leading-[19px] font-normal text-muted">{hint}</span> : null}
      {error ? <span className="text-[13px] font-normal text-negative">Periksa isian ini.</span> : null}
    </label>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { error?: boolean }

// 16px di ponsel supaya Safari iOS tidak memperbesar halaman saat input disentuh.
export function Input({ error, className = '', ...rest }: InputProps) {
  return (
    <input
      aria-invalid={error || undefined}
      className={cn(
        'h-11 w-full rounded-control border bg-surface px-3 text-base font-normal placeholder:text-faint focus:border-accent sm:h-10 sm:text-sm',
        error ? 'border-negative' : 'border-control',
        className,
      )}
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
