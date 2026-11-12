import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/components/ui/cn'

type Variant = 'primary' | 'tint' | 'ghost'
type Size = 'small' | 'default' | 'large'

// Kelasnya sengaja disamakan dengan Button di components/ui. Tautan yang
// tampil seperti tombol tetap harus <a>, supaya bisa dibuka di tab baru dan
// dibacakan sebagai tautan, bukan tombol yang diam-diam pindah halaman.
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white border-transparent hover:bg-accent-ink',
  tint: 'bg-tint-100 text-accent-ink border-transparent hover:bg-tint-200',
  ghost: 'bg-surface text-ink border-control hover:bg-raised',
}

const SIZES: Record<Size, string> = {
  small: 'h-8 px-3 text-[13px]',
  default: 'h-10 px-4 text-sm',
  large: 'h-12 px-5 text-[15px]',
}

type LinkButtonProps = {
  to: string
  variant?: Variant
  size?: Size
  block?: boolean
  className?: string
  children: ReactNode
}

export function LinkButton({ to, variant = 'primary', size = 'default', block = false, className, children }: LinkButtonProps) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control border font-semibold whitespace-nowrap transition-colors',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
    >
      {children}
    </Link>
  )
}
