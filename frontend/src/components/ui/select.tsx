import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type SelectOption = { value: string; label: string }

type Props = {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

// select bawaan browser digambar OS: tidak bisa ditema dan berbeda tiap mesin.
// Panelnya di-portal supaya tidak terpotong kartu atau dialog.
export function Select({ value, options, onChange, label, placeholder = 'Pilih', disabled, className = '' }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, visible: false })

  const selected = options.find((option) => option.value === value)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const height = Math.min(280, options.length * 34 + 8)
    const spaceBelow = window.innerHeight - rect.bottom
    const top = spaceBelow < height && rect.top > spaceBelow ? rect.top - height - 4 : rect.bottom + 4
    setPosition({ top, left: rect.left, width: rect.width, visible: true })
  }, [open, options.length])

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (triggerRef.current?.contains(event.target as Node)) return
      if (panelRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div className={`grid gap-1.5 text-[13px] font-semibold ${className}`}>
      {label ? <span>{label}</span> : null}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-control border border-control bg-surface px-3 text-left text-sm font-normal disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted"
      >
        <span className={selected ? '' : 'text-faint'}>{selected?.label ?? placeholder}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="flex-none stroke-muted">
          <path d="M2 4.5 6 8.5l4-4" fill="none" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              role="listbox"
              style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                width: position.width,
                visibility: position.visible ? 'visible' : 'hidden',
              }}
              className="z-50 max-h-[280px] overflow-y-auto rounded-control border border-border-soft bg-surface p-1 shadow-lg"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={`flex h-8 w-full items-center rounded px-2.5 text-left text-sm hover:bg-raised ${
                    option.value === value ? 'bg-tint-50 text-accent-ink' : ''
                  }`}
                >
                  {option.label}
                </button>
              ))}
              {options.length === 0 ? <p className="px-2.5 py-2 text-[13px] text-muted">{placeholder}</p> : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
