import type { ReactNode } from 'react'
import { cn } from './cn'

type ContainerSize = 'narrow' | 'default' | 'wide'

type ContainerProps = {
  size?: ContainerSize
  className?: string
  children: ReactNode
}

const WIDTHS: Record<ContainerSize, string> = {
  narrow: 'max-w-[720px]',
  default: 'max-w-[1200px]',
  wide: 'max-w-[1440px]',
}

// Satu-satunya tempat lebar maksimum dan gutter halaman ditentukan.
// Kalau sebuah section butuh mx-auto max-w sendiri, berarti ada yang salah.
export function Container({ size = 'default', className, children }: ContainerProps) {
  return <div className={cn('mx-auto w-full px-gutter', WIDTHS[size], className)}>{children}</div>
}
