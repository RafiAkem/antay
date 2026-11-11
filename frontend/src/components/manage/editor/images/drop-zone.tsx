import { useId, useState, type DragEvent, type ReactNode } from 'react'
import { cn } from '@/components/ui/cn'
import { ACCEPT_ATTR } from './image-rules'

type DropZoneProps = {
  label: string
  disabled?: boolean
  onFile: (file: File) => void
  className?: string
  children: ReactNode
}

// Input file asli disembunyikan (sr-only, bukan display:none) supaya tetap bisa
// difokus dengan Tab dan dibuka dengan Enter; tampilannya digambar sendiri.
export function DropZone({ label, disabled, onFile, className, children }: DropZoneProps) {
  const id = useId()
  const [over, setOver] = useState(false)

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setOver(false)
    if (disabled) return
    const file = event.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <label
      htmlFor={id}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={cn(
        'relative grid cursor-pointer place-items-center rounded-card border border-dashed text-center transition-colors has-[:focus-visible]:border-accent',
        over ? 'border-accent bg-tint-50' : 'border-control bg-surface hover:border-accent',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <input
        id={id}
        type="file"
        accept={ACCEPT_ATTR}
        disabled={disabled}
        aria-label={label}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          // dikosongkan supaya memilih berkas yang sama dua kali tetap memicu unggah
          event.target.value = ''
          if (file) onFile(file)
        }}
      />
      {children}
    </label>
  )
}

export function UploadProgress({ percent }: { percent: number }) {
  return (
    <div className="grid w-full max-w-[220px] gap-1.5" role="status" aria-label={`Mengunggah ${percent}%`}>
      <div className="h-1.5 overflow-hidden rounded-pill bg-border-soft">
        <div className="h-full bg-accent transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <span className="font-mono text-xs text-muted">Mengunggah {percent}%</span>
    </div>
  )
}
