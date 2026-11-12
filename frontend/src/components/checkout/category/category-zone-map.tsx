import { useSeatMap } from '@/components/seat-map/use-seat-map'
import { ZoneMap } from '@/components/seat-map/zone-map'
import { Skeleton } from '@/components/ui/skeleton'
import type { CatalogCategory } from '@/types/catalog'

type CategoryZoneMapProps = {
  eventId: string
  categories: CatalogCategory[]
  selectedId: string | null
  onPickSeat: (categoryId: string, seatCode: string) => void
  onSelect: (categoryId: string) => void
}

const IGNORE = () => {}

// Denah semua kategori di langkah pertama checkout. Kalau denahnya gagal
// dimuat, pembeli tetap bisa memilih dari daftar di bawahnya, jadi galatnya
// cukup satu kalimat, bukan halaman galat.
export function CategoryZoneMap({ eventId, categories, selectedId, onPickSeat, onSelect }: CategoryZoneMapProps) {
  const { map, error, loading } = useSeatMap(eventId, IGNORE)

  if (map && map.seats.length > 0) {
    return <ZoneMap map={map} categories={categories} selectedCategoryId={selectedId} onPickSeat={onPickSeat} onPickCategory={onSelect} />
  }
  if (loading) return <Skeleton className="aspect-[10/7] w-full rounded-card" />
  if (error) return <p className="text-[13px] text-muted">Denah belum bisa dimuat. Kategori tetap bisa dipilih dari daftar di bawah.</p>
  return null
}
