import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/components/ui/toast'
import {
  deleteImage,
  fetchEventImages,
  reorderImages,
  updateImageAlt,
  uploadGalleryImage,
  uploadPoster,
} from '@/lib/manage-api'
import type { EventImage } from '@/types/manage'
import { bySortOrder, errorMessage } from '../../shared/manage-labels'
import { checkImage, GALLERY_MAX, uploadErrorMessage } from './image-rules'

// Progres per tujuan unggah. null = tidak sedang mengunggah.
export type Uploading = { poster: number | null; gallery: number | null }

export function useEventImages(eventId: string, onPosterChanged: () => void) {
  const toast = useToast()
  const [images, setImages] = useState<EventImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [settled, setSettled] = useState(-1)
  const [uploading, setUploading] = useState<Uploading>({ poster: null, gallery: null })
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    fetchEventImages(eventId, controller.signal)
      .then((list) => {
        setImages(list)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(cause, 'Gambar belum bisa dimuat. Coba lagi.'))
      })
      .finally(() => {
        if (!controller.signal.aborted) setSettled(version)
      })
    return () => controller.abort()
  }, [eventId, version])

  const loading = settled === -1
  const poster = images.find((image) => image.kind === 'poster') ?? null
  const gallery = bySortOrder(images.filter((image) => image.kind === 'gallery'))

  async function upload(kind: keyof Uploading, file: File) {
    const problem = await checkImage(file)
    if (problem) {
      toast.error(problem)
      return
    }
    if (kind === 'gallery' && gallery.length >= GALLERY_MAX) {
      toast.error(`Galeri sudah berisi ${GALLERY_MAX} gambar. Hapus satu dulu.`)
      return
    }
    setUploading((current) => ({ ...current, [kind]: 0 }))
    const onProgress = (percent: number) => setUploading((current) => ({ ...current, [kind]: percent }))
    try {
      if (kind === 'poster') await uploadPoster(eventId, file, { onProgress })
      else await uploadGalleryImage(eventId, file, { onProgress })
      toast.show(kind === 'poster' ? 'Poster diperbarui.' : 'Gambar ditambahkan ke galeri.', 'ok')
      reload()
      if (kind === 'poster') onPosterChanged()
    } catch (cause) {
      toast.error(uploadErrorMessage(cause))
    } finally {
      setUploading((current) => ({ ...current, [kind]: null }))
    }
  }

  async function withBusy(id: string, task: () => Promise<void>, done: string, fail: string) {
    setBusyId(id)
    try {
      await task()
      toast.show(done, 'ok')
      reload()
      return true
    } catch (cause) {
      toast.error(errorMessage(cause, fail))
      return false
    } finally {
      setBusyId(null)
    }
  }

  const saveAlt = (image: EventImage, alt: string) =>
    withBusy(image.id, () => updateImageAlt(image.id, alt.trim()), 'Teks alternatif disimpan.', 'Teks alternatif gagal disimpan.')

  const remove = (image: EventImage) =>
    withBusy(image.id, () => deleteImage(image.id), 'Gambar dihapus dari galeri.', 'Gambar gagal dihapus.')

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= gallery.length) return
    const ids = gallery.map((image) => image.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    void withBusy(gallery[index].id, () => reorderImages(eventId, ids), 'Urutan galeri disimpan.', 'Urutan galeri gagal disimpan.')
  }

  return { loading, error, reload, poster, gallery, uploading, busyId, upload, saveAlt, remove, move }
}
