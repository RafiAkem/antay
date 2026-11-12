import type { CatalogCategory } from '@/types/catalog'

const ZONE_COLORS = [
  'var(--color-zone-1)',
  'var(--color-zone-2)',
  'var(--color-zone-3)',
  'var(--color-zone-4)',
  'var(--color-zone-5)',
  'var(--color-zone-6)',
]

// Warna per kategori berkursi, mengikuti urutan kategori yang diberikan
// (pemanggil sudah mengurutkannya dari yang termurah). Lebih dari enam
// kategori berkursi jarang terjadi; kalau ada, warnanya berulang tapi nama
// kategori tetap terbaca di label blok dan legenda.
export function zoneColors(categories: CatalogCategory[]): Record<string, string> {
  const colors: Record<string, string> = {}
  categories
    .filter((category) => category.isSeated)
    .forEach((category, index) => {
      colors[category.id] = ZONE_COLORS[index % ZONE_COLORS.length]
    })
  return colors
}
