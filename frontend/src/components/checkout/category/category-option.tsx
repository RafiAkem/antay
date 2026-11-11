import { SCARCE_LEFT } from '@/components/events/detail/event-format'
import { EventGlyph } from '@/components/events/detail/event-glyph'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/components/ui/cn'
import { Price } from '@/components/ui/price'
import type { CatalogCategory } from '@/types/catalog'

type CategoryOptionProps = {
  category: CatalogCategory
  // sisa terbesar di antara kategori, jadi patokan 100% bar
  maxLeft: number
  selected: boolean
  onSelect: () => void
}

// Baris kategori sama seperti di halaman event supaya pembeli mengenali
// pilihannya. Bedanya, di sini baris langsung memilih, bukan membuka daftar paket.
export function CategoryOption({ category, maxLeft, selected, onSelect }: CategoryOptionProps) {
  const { soldOut, left } = category
  const share = maxLeft > 0 ? Math.max(4, Math.round((left / maxLeft) * 100)) : 0
  const lowShare = left < maxLeft * 0.2
  const scarce = !soldOut && left < SCARCE_LEFT
  const unit = category.isSeated ? 'kursi' : 'orang'

  return (
    <li className="border-t border-border-soft first:border-t-0">
      <button
        type="button"
        onClick={onSelect}
        disabled={soldOut}
        aria-pressed={selected}
        className={cn(
          'grid w-full gap-2 px-4 py-4 text-left transition-colors sm:px-5',
          selected ? 'bg-tint-50' : 'hover:bg-raised',
          'disabled:cursor-not-allowed disabled:hover:bg-transparent',
        )}
      >
        <span className="flex items-start justify-between gap-3">
          <span className="grid min-w-0 gap-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className={cn('text-[15px] leading-[22px] font-bold', soldOut && 'text-muted')}>{category.name}</span>
              {category.isSeated ? <Badge tone="accent">Pakai kursi</Badge> : null}
              {soldOut ? <Badge tone="neutral" className="border border-border-soft">Habis</Badge> : null}
            </span>
            {category.description ? <span className="truncate text-[13px] leading-[19px] text-muted">{category.description}</span> : null}
          </span>
          <span className="flex flex-none items-center gap-2">
            {category.priceFrom !== null ? <Price amount={category.priceFrom} prefix="Mulai" size="sm" /> : null}
            {soldOut ? null : <EventGlyph name="chevron" className={cn('-rotate-90 text-muted', selected && 'text-accent')} />}
          </span>
        </span>
        {soldOut ? null : (
          <span className="flex items-center gap-3">
            <span aria-hidden="true" className="h-1 flex-1 overflow-hidden rounded-pill bg-border-soft">
              <span className={cn('block h-full rounded-pill', lowShare ? 'bg-scarce' : 'bg-accent')} style={{ width: `${share}%` }} />
            </span>
            <span className={cn('num text-xs', scarce ? 'font-semibold text-scarce' : 'text-muted')}>
              Sisa {left} {unit}
            </span>
          </span>
        )}
      </button>
    </li>
  )
}
