import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`min-w-0 rounded-[var(--radius-card)] border border-border-soft bg-surface p-5 ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHead({ title, meta }: { title: ReactNode; meta?: ReactNode }) {
  return (
    <div className="mb-3.5 flex items-baseline justify-between gap-3">
      <h2 className="text-base font-semibold leading-[22px]">{title}</h2>
      {meta ? <span className="text-xs text-muted">{meta}</span> : null}
    </div>
  )
}
