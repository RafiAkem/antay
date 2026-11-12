import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

type ControlProps = {
  id: string
  'aria-describedby'?: string
}

type FormFieldProps = {
  id: string
  label: string
  hint?: ReactNode
  // String kosong berarti cukup bingkai merah tanpa kalimat, misalnya
  // email dan sandi yang tidak cocok: alasannya sudah ada di toast.
  error?: string
  // Petunjuk yang berubah sambil mengetik (panjang sandi) dibacakan pelan.
  liveHint?: boolean
  className?: string
  children: (control: ControlProps) => ReactNode
}

// Field di components/ui hanya punya kalimat galat baku. Form akun butuh
// kalimat dari server ("Email ini sudah terdaftar"), jadi pembungkusnya dibuat
// di sini dan disambungkan ke input lewat aria-describedby.
export function FormField({ id, label, hint, error, liveHint, className, children }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] leading-[19px] font-semibold text-ink">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy })}
      {error ? (
        <p id={errorId} className="text-[13px] leading-[19px] text-negative">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} aria-live={liveHint ? 'polite' : undefined} className="text-[13px] leading-[19px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
