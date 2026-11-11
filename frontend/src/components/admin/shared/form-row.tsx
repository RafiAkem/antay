import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

type FormRowProps = {
  id: string
  label: string
  error?: string
  hint?: string
  className?: string
  children: ReactNode
}

// Field di components/ui hanya bisa bilang "Periksa isian ini.". Form admin
// butuh alasan spesifik dari server ("format email tidak valid"), jadi
// pesannya ditaruh di sini, tepat di bawah input yang salah.
export function FormRow({ id, label, error, hint, className, children }: FormRowProps) {
  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] leading-[18px] font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] leading-[18px] text-negative">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] leading-[18px] text-muted">{hint}</p>
      ) : null}
    </div>
  )
}
