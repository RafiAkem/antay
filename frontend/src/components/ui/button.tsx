import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'tint' | 'ghost' | 'danger'
type Size = 'default' | 'small' | 'large'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-white border-transparent hover:bg-accent-ink disabled:bg-raised disabled:text-faint disabled:border-border-soft',
  tint: 'bg-tint-100 text-accent-ink border-transparent hover:bg-tint-200 disabled:bg-raised disabled:text-faint',
  ghost: 'bg-surface text-ink border-control hover:bg-raised disabled:bg-raised disabled:text-faint',
  danger:
    'bg-negative text-white border-transparent hover:bg-negative-ink disabled:bg-raised disabled:text-faint disabled:border-border-soft',
}

// large untuk tombol beli dan bayar: 48px enak dijangkau jempol di ponsel.
const SIZES: Record<Size, string> = {
  small: 'h-8 px-3 text-[13px]',
  default: 'h-10 px-4 text-sm',
  large: 'h-12 px-5 text-[15px]',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  block?: boolean
}

export function Button({
  variant = 'primary',
  size = 'default',
  block = false,
  className = '',
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control border font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    />
  )
}
