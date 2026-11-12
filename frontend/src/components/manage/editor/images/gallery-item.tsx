import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/field'
import type { EventImage } from '@/types/manage'
import { OrderButtons, TextAction } from '../../shared/order-buttons'

type GalleryItemProps = {
  image: EventImage
  index: number
  total: number
  busy: boolean
  editable: boolean
  onSaveAlt: (alt: string) => Promise<boolean>
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
  onDirtyChange: (id: string, dirty: boolean) => void
}

export function GalleryItem({ image, index, total, busy, editable, onSaveAlt, onRemove, onMove, onDirtyChange }: GalleryItemProps) {
  const [alt, setAlt] = useState(image.alt)
  const [savedAlt, setSavedAlt] = useState(image.alt)
  if (savedAlt !== image.alt) {
    setSavedAlt(image.alt)
    setAlt(image.alt)
  }
  const dirty = alt.trim() !== image.alt.trim()

  useEffect(() => onDirtyChange(image.id, dirty), [image.id, dirty, onDirtyChange])
  useEffect(() => () => onDirtyChange(image.id, false), [image.id, onDirtyChange])

  const inputId = `alt-${image.id}`

  return (
    <li className="grid min-w-0 content-start gap-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-night">
        <img
          src={image.url}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <span className="absolute top-1.5 left-1.5 rounded-tag bg-night/70 px-1.5 font-mono text-[11px] leading-5 text-board-ink">
          {index + 1}
        </span>
      </div>
      <label htmlFor={inputId} className="sr-only">
        Teks alternatif gambar {index + 1}
      </label>
      <Input
        id={inputId}
        value={alt}
        maxLength={140}
        disabled={!editable || busy}
        placeholder="Jelaskan isi gambar"
        onChange={(event) => setAlt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && dirty) void onSaveAlt(alt)
        }}
      />
      {editable ? (
        <div className="flex flex-wrap items-center justify-between gap-1">
          <OrderButtons label={`gambar ${index + 1}`} first={index === 0} last={index === total - 1} disabled={busy} onMove={onMove} />
          <span className="flex">
            {dirty ? (
              <TextAction onClick={() => void onSaveAlt(alt)} disabled={busy}>
                Simpan
              </TextAction>
            ) : null}
            <TextAction tone="danger" onClick={onRemove} disabled={busy} label={`Hapus gambar ${index + 1}`}>
              Hapus
            </TextAction>
          </span>
        </div>
      ) : null}
    </li>
  )
}
