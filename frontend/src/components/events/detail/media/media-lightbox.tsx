import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { EventGlyph } from '../event-glyph'
import type { MediaItem } from './media-items'

type Props = {
  items: MediaItem[]
  index: number | null
  onIndex: (index: number) => void
  onClose: () => void
}

// Lightbox sederhana di atas Modal: satu foto, keterangan alt, sebelumnya dan
// berikutnya. Panah kiri/kanan di keyboard ikut jalan, Esc sudah diurus Modal.
export function MediaLightbox({ items, index, onIndex, onClose }: Props) {
  const open = index !== null && items.length > 0
  const current = open ? items[index] : null
  const count = items.length

  useEffect(() => {
    if (index === null || count < 2) return
    const at = index
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') onIndex((at + 1) % count)
      if (event.key === 'ArrowLeft') onIndex((at - 1 + count) % count)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, count, onIndex])

  if (!current || index === null) return null

  return (
    <Modal open={open} onClose={onClose} title={`Foto ${index + 1} dari ${count}`} width="lg">
      <figure className="grid gap-3">
        <div className="grid place-items-center overflow-hidden rounded-card bg-night">
          <img
            src={current.url}
            alt={current.alt}
            width={current.width}
            height={current.height}
            decoding="async"
            className="max-h-[min(70dvh,640px)] w-auto max-w-full object-contain"
          />
        </div>
        <figcaption className="text-[13px] leading-[19px] text-muted">{current.alt}</figcaption>
      </figure>
      {count > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <Button variant="ghost" size="small" onClick={() => onIndex((index - 1 + count) % count)}>
            <EventGlyph name="arrow" size={14} className="rotate-180" />
            Sebelumnya
          </Button>
          <span className="num text-xs text-muted">
            {index + 1}/{count}
          </span>
          <Button variant="ghost" size="small" onClick={() => onIndex((index + 1) % count)}>
            Berikutnya
            <EventGlyph name="arrow" size={14} />
          </Button>
        </div>
      ) : null}
    </Modal>
  )
}
