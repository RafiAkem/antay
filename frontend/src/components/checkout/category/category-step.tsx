import { useMemo } from 'react'
import { sortCategories } from '@/components/events/detail/event-format'
import { Empty } from '@/components/ui/pill'
import type { CatalogEventDetail } from '@/types/catalog'
import { CategoryOption } from './category-option'

type CategoryStepProps = {
  event: CatalogEventDetail
  selectedId: string | null
  onSelect: (categoryId: string) => void
}

export function CategoryStep({ event, selectedId, onSelect }: CategoryStepProps) {
  const categories = useMemo(() => sortCategories(event.categories), [event.categories])
  const maxLeft = useMemo(() => Math.max(0, ...categories.map((category) => category.left)), [categories])

  if (categories.length === 0) {
    return (
      <Empty
        title="Kategori tiket belum dibuka."
        hint="Penyelenggara masih menyiapkan harga dan kuota. Coba buka halaman ini lagi menjelang tanggal jual."
      />
    )
  }

  return (
    <ul className="overflow-hidden rounded-card border border-border-soft bg-surface">
      {categories.map((category) => (
        <CategoryOption
          key={category.id}
          category={category}
          maxLeft={maxLeft}
          selected={category.id === selectedId}
          onSelect={() => onSelect(category.id)}
        />
      ))}
    </ul>
  )
}
