import { fetchCategories } from '@/lib/manage-api'
import type { ManagedCategory, ManagedEventSummary } from '@/types/manage'

// Baris daftar = ringkasan dari /manage/events, lalu kategori menyusul.
// categories undefined berarti masih dimuat (atau gagal), bukan nol kategori.
export type ListedEvent = ManagedEventSummary & { categories?: ManagedCategory[] }

// Daftar dari backend tidak membawa kategori, padahal kolom "Kategori" dan
// "Mulai dari" butuh itu. Diambil per event sekaligus; yang gagal dibiarkan
// kosong supaya satu event bermasalah tidak menahan seluruh daftar.
export async function fillCategories(events: ManagedEventSummary[], signal: AbortSignal): Promise<ListedEvent[]> {
  const results = await Promise.allSettled(events.map((event) => fetchCategories(event.id, signal)))
  return events.map((event, index) => {
    const result = results[index]
    return result.status === 'fulfilled' ? { ...event, categories: result.value } : event
  })
}
