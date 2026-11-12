import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'

type Props = {
  to: string
  disabled?: boolean
  size?: 'default' | 'large'
  block?: boolean
  className?: string
  children: ReactNode
}

// Tombol beli adalah navigasi ke checkout, jadi dibuat <a> supaya bisa dibuka
// di tab baru. Saat tidak bisa beli, jatuh ke Button disabled biasa karena <a>
// tidak punya keadaan disabled yang dimengerti pembaca layar.
// Kelasnya meniru Button primary; kalau Button berubah, ini ikut disesuaikan.
export function BuyLink({ to, disabled, size = 'large', block, className, children }: Props) {
  if (disabled) {
    return (
      <Button size={size} block={block} disabled className={className}>
        {children}
      </Button>
    )
  }
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control border border-transparent bg-accent font-semibold whitespace-nowrap text-white transition-colors hover:bg-accent-ink',
        size === 'large' ? 'h-12 px-5 text-[15px]' : 'h-10 px-4 text-sm',
        block && 'w-full',
        className,
      )}
    >
      {children}
    </Link>
  )
}
