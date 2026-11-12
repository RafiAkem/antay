import type { CatalogEventDetail } from '@/types/catalog'

export type MediaItem = {
  url: string
  alt: string
  // ukuran poster tidak dikirim server, jadi boleh kosong; galeri selalu punya
  width?: number
  height?: number
}

// Poster jadi foto pertama di lightbox, lalu galeri sesuai urutan server.
// Galeri yang alt-nya kosong diberi keterangan cadangan supaya pembaca layar
// tidak cuma mendengar nama berkas.
export function mediaItemsOf(event: CatalogEventDetail): MediaItem[] {
  const items: MediaItem[] = []
  if (event.posterUrl) items.push({ url: event.posterUrl, alt: `Poster ${event.name}` })
  event.gallery.forEach((image, index) => {
    items.push({
      url: image.url,
      alt: image.alt.trim() || `Foto ${index + 1} ${event.name}`,
      width: image.width || undefined,
      height: image.height || undefined,
    })
  })
  return items
}
