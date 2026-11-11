import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/components/ui/cn'

type Variant = 'primary' | 'ghost' | 'tint'

// Tautan yang tampil seperti Button. Kelasnya sengaja meniru ui/button.tsx;
// kalau nanti ada primitif ButtonLink di components/ui, ganti ke sana.
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white border-transparent hover:bg-accent-ink',
  ghost: 'bg-surface text-ink border-control hover:bg-raised',
  tint: 'bg-tint-100 text-accent-ink border-transparent hover:bg-tint-200',
}

type Props = Omit<LinkProps, 'className'> & { variant?: Variant; small?: boolean; className?: string }

export function ButtonLink({ variant = 'primary', small = false, className, ...rest }: Props) {
  return (
    <Link
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control border font-semibold whitespace-nowrap transition-colors',
        small ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-sm',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  )
}
