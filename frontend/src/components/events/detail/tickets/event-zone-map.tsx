import { useNavigate } from 'react-router-dom'
import { useSeatMap } from '@/components/seat-map/use-seat-map'
import { ZoneMap } from '@/components/seat-map/zone-map'
import { Skeleton } from '@/components/ui/skeleton'
import type { CatalogCategory } from '@/types/catalog'
import { checkoutPath } from '../event-format'

type EventZoneMapProps = {
  eventId: string
  categories: CatalogCategory[]
  buyable: boolean
}

const IGNORE = () => {}

// Denah semua kategori di halaman event. Saat penjualan dibuka, mengetuk kursi
// langsung membawa pembeli ke checkout dengan kategori dan kursi itu terpilih.
// Kalau denah gagal dimuat, bagian ini diam saja: daftar kategori tetap ada.
export function EventZoneMap({ eventId, categories, buyable }: EventZoneMapProps) {
  const navigate = useNavigate()
  const { map, loading } = useSeatMap(eventId, IGNORE)

  if (loading && !map) return <Skeleton className="mb-4 aspect-[10/7] w-full rounded-card" />
  if (!map || map.seats.length === 0) return null
  return (
    <ZoneMap
      map={map}
      categories={categories}
      className="mb-4"
      onPickSeat={buyable ? (categoryId, seatCode) => navigate(checkoutPath(eventId, categoryId, seatCode)) : undefined}
      onPickCategory={buyable ? (categoryId) => navigate(checkoutPath(eventId, categoryId)) : undefined}
    />
  )
}
