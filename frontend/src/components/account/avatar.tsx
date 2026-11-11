import { cn } from '@/components/ui/cn'
import { initialOf } from './auth-rules'

type Props = {
  name: string
  email: string
  size?: 'sm' | 'lg'
  // onDark: di atas foto hero header masih transparan, jadi lingkarannya ikut terang.
  onDark?: boolean
  className?: string
}

export function Avatar({ name, email, size = 'sm', onDark = false, className }: Props) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-grid flex-none place-items-center rounded-pill font-bold',
        size === 'sm' ? 'h-7 w-7 text-[13px]' : 'h-14 w-14 text-xl',
        onDark ? 'bg-white/20 text-white' : 'bg-tint-100 text-accent-ink',
        className,
      )}
    >
      {initialOf(name, email)}
    </span>
  )
}
