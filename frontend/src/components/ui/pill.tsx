import type { ReactNode } from 'react'

type Tone = 'ok' | 'bad' | 'warn' | 'brand' | 'neutral'

const TONES: Record<Tone, string> = {
  ok: 'bg-positive-bg text-positive-ink',
  bad: 'bg-negative-bg text-negative-ink',
  warn: 'bg-warning-bg text-warning-ink',
  brand: 'bg-tint-100 text-accent-ink',
  neutral: 'bg-raised text-muted',
}

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-[22px] flex-none items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}

export function Empty({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="grid gap-1.5 rounded-[var(--radius-card)] border border-dashed border-control p-4 text-muted">
      <b className="font-semibold text-ink">{title}</b>
      <span className="text-sm leading-5">{hint}</span>
      {action}
    </div>
  )
}
