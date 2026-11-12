import type { ReactNode } from 'react'
import { cn } from './cn'

type SectionPad = 'none' | 'sm' | 'default'

type SectionProps = {
  pad?: SectionPad
  id?: string
  labelledBy?: string
  className?: string
  children: ReactNode
}

// Halaman sengaja rapat: jarak antarbagian cukup untuk memisahkan, bukan untuk "bernapas"
// seperti landing page. Kalau terasa sempit, ubah di sini, jangan per halaman.
const PADS: Record<SectionPad, string> = {
  none: '',
  sm: 'py-[clamp(16px,3vw,28px)]',
  default: 'py-[clamp(32px,5vw,48px)]',
}

export function Section({ pad = 'default', id, labelledBy, className, children }: SectionProps) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn(PADS[pad], className) || undefined}>
      {children}
    </section>
  )
}
