import type { ReactNode } from 'react'
import { cn } from './cn'

type StickyCtaProps = {
  className?: string
  children: ReactNode
}

// Di ponsel bar ini menempel di bawah dan sengaja lebih tinggi dari tab bar
// (z-30 di atas z-20), jadi di halaman event dan checkout tab bar tertutup,
// pola umum marketplace event. Spacer di bawah menjaga isi terakhir tidak ketutup.
// Jangan taruh di dalam elemen ber-transform: fixed jadi ikut elemen itu.
// Di desktop isinya tampil biasa di tempatnya, misalnya di panel kanan.
export function StickyCta({ className, children }: StickyCtaProps) {
  return (
    <>
      <div aria-hidden="true" className="h-6 lg:hidden" />
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 flex min-h-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom,0px)+8px)] items-center justify-between gap-3',
          'border-t border-border-soft bg-surface px-gutter pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))]',
          'lg:static lg:z-auto lg:min-h-0 lg:border-0 lg:bg-transparent lg:p-0',
          className,
        )}
      >
        {children}
      </div>
    </>
  )
}
