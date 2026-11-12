import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/components/ui/cn'

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean; size?: 'sm' | 'md' }

// Belum ada primitif textarea di components/ui, jadi dibuat di sini dengan gaya Input.
// Tingginya tetap (tanpa grip resize) supaya tata letak form tidak bergeser.
export function TextArea({ error, size = 'md', className, ...rest }: TextAreaProps) {
  return (
    <textarea
      aria-invalid={error || undefined}
      className={cn(
        'w-full resize-none rounded-control border bg-surface px-3 py-2.5 text-base leading-6 font-normal placeholder:text-faint focus:border-accent sm:text-sm sm:leading-[21px]',
        size === 'sm' ? 'h-20' : 'h-32',
        error ? 'border-negative' : 'border-control',
        className,
      )}
      {...rest}
    />
  )
}
