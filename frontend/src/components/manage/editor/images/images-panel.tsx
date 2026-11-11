import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardHead } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { EventImage, ManagedEvent } from '@/types/manage'
import { ConfirmModal } from '../../shared/confirm-modal'
import { LoadError } from '../../shared/load-error'
import { DropZone, UploadProgress } from './drop-zone'
import { GalleryItem } from './gallery-item'
import { GALLERY_MAX } from './image-rules'
import { PosterCard } from './poster-card'
import { useEventImages } from './use-event-images'

type ImagesPanelProps = {
  event: ManagedEvent
  editable: boolean
  reload: () => void
  onDirtyChange: (dirty: boolean) => void
}

export function ImagesPanel({ event, editable, reload, onDirtyChange }: ImagesPanelProps) {
  const images = useEventImages(event.id, reload)
  const [removal, setRemoval] = useState<EventImage | null>(null)
  // Teks alternatif yang belum disimpan, per gambar. Editor cukup tahu ada atau tidak.
  const dirtyIds = useRef(new Set<string>())

  const reportAlt = useCallback(
    (id: string, dirty: boolean) => {
      if (dirty) dirtyIds.current.add(id)
      else dirtyIds.current.delete(id)
      onDirtyChange(dirtyIds.current.size > 0)
    },
    [onDirtyChange],
  )
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  if (images.loading) {
    return (
      <div className="grid gap-4" role="status" aria-label="Memuat gambar">
        <Skeleton className="h-[280px] w-full rounded-card" />
        <Skeleton className="h-[200px] w-full rounded-card" />
      </div>
    )
  }
  if (images.error) return <LoadError message={images.error} onRetry={images.reload} />

  const { gallery } = images
  const full = gallery.length >= GALLERY_MAX

  return (
    <div className="grid gap-4">
      <PosterCard
        name={event.name}
        eventDate={event.eventDate}
        posterUrl={images.poster?.url ?? event.posterUrl}
        progress={images.uploading.poster}
        editable={editable}
        onFile={(file) => void images.upload('poster', file)}
      />

      <Card>
        <CardHead title="Galeri" meta={`${gallery.length}/${GALLERY_MAX} gambar`} />
        <p className="mb-4 text-[13px] leading-[19px] text-muted">
          Foto suasana, panggung, atau denah lokasi. Teks alternatif dibacakan pembaca layar, jadi tulis isi gambarnya,
          misal &ldquo;Panggung utama dengan lampu biru&rdquo;.
        </p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {gallery.map((image, index) => (
            <GalleryItem
              key={image.id}
              image={image}
              index={index}
              total={gallery.length}
              busy={images.busyId !== null}
              editable={editable}
              onSaveAlt={(alt) => images.saveAlt(image, alt)}
              onRemove={() => setRemoval(image)}
              onMove={(direction) => images.move(index, direction)}
              onDirtyChange={reportAlt}
            />
          ))}
          {editable && !full ? (
            <li>
              <DropZone
                label="Tambah gambar galeri"
                disabled={images.uploading.gallery !== null}
                onFile={(file) => void images.upload('gallery', file)}
                className="aspect-[4/3] w-full p-3"
              >
                {images.uploading.gallery !== null ? (
                  <UploadProgress percent={images.uploading.gallery} />
                ) : (
                  <span className="grid gap-1">
                    <span className="text-sm font-semibold text-accent">Tambah gambar</span>
                    <span className="text-xs text-muted">Seret ke sini atau pilih berkas</span>
                  </span>
                )}
              </DropZone>
            </li>
          ) : null}
        </ul>
        {full ? <p className="mt-3 text-[13px] text-muted">Galeri penuh. Hapus satu gambar untuk menambah yang baru.</p> : null}
        {!editable && gallery.length === 0 ? <p className="text-[13px] text-muted">Galeri event ini kosong.</p> : null}
      </Card>

      <ConfirmModal
        open={removal !== null}
        title="Hapus gambar ini?"
        description="Gambar langsung hilang dari galeri halaman event."
        confirmLabel="Hapus"
        busyLabel="Menghapus..."
        tone="danger"
        busy={removal !== null && images.busyId === removal.id}
        onClose={() => setRemoval(null)}
        onConfirm={() => {
          if (!removal) return
          void images.remove(removal).then(() => setRemoval(null))
        }}
      />
    </div>
  )
}
