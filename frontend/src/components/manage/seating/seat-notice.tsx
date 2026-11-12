import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

type Tone = 'warn' | 'bad' | 'info'

const TONES: Record<Tone, string> = {
  warn: 'border-warning-border bg-warning-bg text-warning-ink',
  bad: 'border-negative-bg bg-negative-bg text-negative-ink',
  info: 'border-transparent bg-tint-50 text-accent-ink',
}

// Versi kecil Notice khusus editor denah. Notice di components/counter milik
// loket, jadi tidak dipinjam supaya perubahan di sana tidak merembet ke sini.
export function SeatNotice({ tone, title, children }: { tone: Tone; title?: string; children: ReactNode }) {
  return (
    <div
      role={tone === 'bad' ? 'alert' : 'status'}
      className={cn('grid gap-1 rounded-control border px-3 py-2.5 text-[13px] leading-[19px]', TONES[tone])}
    >
      {title ? <b className="font-semibold">{title}</b> : null}
      <div>{children}</div>
    </div>
  )
}
