import { useMemo } from 'react'
import { sortCategories } from '@/components/events/detail/event-format'
import { Empty } from '@/components/ui/pill'
import type { CatalogEventDetail } from '@/types/catalog'
import { CategoryOption } from './category-option'
import { CategoryZoneMap } from './category-zone-map'

type CategoryStepProps = {
  event: CatalogEventDetail
  selectedId: string | null
  onSelect: (categoryId: string) => void
  onPickSeat: (categoryId: string, seatCode: string) => void
}

export function CategoryStep({ event, selectedId, onSelect, onPickSeat }: CategoryStepProps) {
  const categories = useMemo(() => sortCategories(event.categories), [event.categories])
  const maxLeft = useMemo(() => Math.max(0, ...categories.map((category) => category.left)), [categories])
  const hasSeats = categories.some((category) => category.isSeated)

  if (categories.length === 0) {
    return (
      <Empty
        title="Kategori tiket belum dibuka."
        hint="Penyelenggara masih menyiapkan harga dan kuota. Coba buka halaman ini lagi menjelang tanggal jual."
      />
    )
  }

  return (
    <div className="grid gap-5">
      {hasSeats ? (
        <CategoryZoneMap eventId={event.id} categories={categories} selectedId={selectedId} onPickSeat={onPickSeat} onSelect={onSelect} />
      ) : null}
      <div className="grid gap-2">
        {hasSeats ? <p className="text-sm font-semibold text-ink">Atau pilih dari daftar</p> : null}
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
      </div>
    </div>
  )
}
