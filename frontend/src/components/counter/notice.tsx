import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

type Tone = 'ok' | 'bad' | 'warn' | 'brand'

// Garis kiri tebal supaya status terbaca sekilas dari jarak lengan, tanpa
// harus membaca kalimatnya dulu. Warnanya tetap token status, bukan aksen baru.
const TONES: Record<Tone, string> = {
  ok: 'border-positive bg-positive-bg text-positive-ink',
  bad: 'border-negative bg-negative-bg text-negative-ink',
  warn: 'border-scarce bg-warning-bg text-warning-ink',
  brand: 'border-accent bg-tint-50 text-accent-ink',
}

export function Notice({ tone, title, children }: { tone: Tone; title?: string; children: ReactNode }) {
  return (
    <div
      role={tone === 'bad' ? 'alert' : 'status'}
      className={cn('grid gap-1 rounded-control border-l-4 px-3.5 py-3 text-sm', TONES[tone])}
    >
      {title ? <b className="font-bold">{title}</b> : null}
      <span className="leading-5">{children}</span>
    </div>
  )
}
