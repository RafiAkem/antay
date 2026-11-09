import type { ReactNode } from 'react'

type Tone = 'ok' | 'bad' | 'warn' | 'brand'

const TONES: Record<Tone, string> = {
  ok: 'bg-positive-bg text-positive-ink',
  bad: 'bg-negative-bg text-negative-ink',
  warn: 'border border-warning-border bg-warning-bg text-warning-ink',
  brand: 'bg-tint-50 text-accent-ink',
}

export function Notice({ tone, title, children }: { tone: Tone; title?: string; children: ReactNode }) {
  return (
    <div
      role={tone === 'bad' ? 'alert' : 'status'}
      className={`grid gap-1 rounded-[var(--radius-control)] px-3.5 py-3 text-sm ${TONES[tone]}`}
    >
      {title ? <b className="font-semibold">{title}</b> : null}
      <span className="leading-5">{children}</span>
    </div>
  )
}
