import type { ReactNode } from 'react'
import { cn } from './cn'

type HeadingSize = 'display' | 'xl' | 'lg' | 'md'
type HeadingLevel = 1 | 2 | 3

type HeadingProps = {
  level: HeadingLevel
  size?: HeadingSize
  id?: string
  className?: string
  children: ReactNode
}

// level menentukan semantik (h1/h2/h3), size menentukan tampilan. Keduanya
// dipisah supaya judul kartu bisa tetap h3 tanpa harus terlihat besar.
const HEADING_SIZES: Record<HeadingSize, string> = {
  display: 'text-[clamp(28px,6vw,44px)] leading-[1.1] font-bold tracking-[-0.02em]',
  xl: 'text-[clamp(22px,3.6vw,30px)] leading-[1.2] font-bold tracking-[-0.015em]',
  lg: 'text-lg leading-6 font-bold tracking-[-0.01em] sm:text-xl sm:leading-7',
  md: 'text-[15px] leading-[22px] font-semibold',
}

const DEFAULT_SIZE: Record<HeadingLevel, HeadingSize> = { 1: 'xl', 2: 'lg', 3: 'md' }

export function Heading({ level, size, id, className, children }: HeadingProps) {
  const Tag = `h${level}` as const
  return (
    <Tag id={id} className={cn('text-balance', HEADING_SIZES[size ?? DEFAULT_SIZE[level]], className)}>
      {children}
    </Tag>
  )
}

type ParagraphProps = {
  tone?: 'default' | 'muted'
  size?: 'sm' | 'md'
  className?: string
  children: ReactNode
}

export function Paragraph({ tone = 'default', size = 'md', className, children }: ParagraphProps) {
  return (
    <p
      className={cn(
        size === 'sm' ? 'text-[13px] leading-[19px]' : 'text-sm leading-[21px]',
        tone === 'muted' && 'text-muted',
        className,
      )}
    >
      {children}
    </p>
  )
}

type LabelProps = {
  htmlFor?: string
  className?: string
  children: ReactNode
}

// Label kecil untuk metadata dan judul kolom. Jadi <label> sungguhan hanya
// kalau memang menunjuk ke input lewat htmlFor.
export function Label({ htmlFor, className, children }: LabelProps) {
  const classes = cn('text-xs leading-4 font-semibold text-muted', className)
  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className={classes}>
        {children}
      </label>
    )
  }
  return <span className={classes}>{children}</span>
}
