import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'
type Size = 'default' | 'small'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-white border-transparent hover:bg-accent-ink disabled:bg-raised disabled:text-muted disabled:border-border-soft',
  ghost:
    'bg-surface text-ink border-control hover:bg-raised disabled:bg-raised disabled:text-muted',
  danger:
    'bg-negative text-white border-transparent hover:bg-negative-ink disabled:bg-raised disabled:text-muted disabled:border-border-soft',
}

const SIZES: Record<Size, string> = {
  default: 'h-[38px] px-4 text-sm',
  small: 'h-[30px] px-3 text-[13px]',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'primary', size = 'default', className = '', type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    />
  )
}
