import type { ReactNode } from 'react'
import { cn } from './cn'

// Datar: garis tipis tanpa bayangan. Padding sedikit lebih rapat di ponsel.
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 rounded-card border border-border-soft bg-surface p-4 sm:p-5', className)}>
      {children}
    </div>
  )
}

export function CardHead({ title, meta }: { title: ReactNode; meta?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-base leading-[22px] font-bold">{title}</h2>
      {meta ? <span className="text-xs text-muted">{meta}</span> : null}
    </div>
  )
}
