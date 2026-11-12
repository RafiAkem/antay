import type { ReactNode } from 'react'
import { cn } from './cn'

export type BadgeTone = 'promo' | 'scarce' | 'accent' | 'neutral' | 'positive'

type BadgeProps = {
  tone: BadgeTone
  className?: string
  children: ReactNode
}

// promo diisi penuh karena tab diskon harus terbaca di atas foto apa pun.
// neutral memakai warna ground supaya terlihat seperti potongan kartu di sudut foto.
const TONES: Record<BadgeTone, string> = {
  promo: 'bg-promo text-white',
  scarce: 'bg-scarce-bg text-scarce',
  accent: 'bg-tint-100 text-accent-ink',
  neutral: 'bg-ground text-ink',
  positive: 'bg-positive-bg text-positive-ink',
}

export function Badge({ tone, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 flex-none items-center gap-1 rounded-tag px-1.5 text-[11px] leading-none font-bold whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
