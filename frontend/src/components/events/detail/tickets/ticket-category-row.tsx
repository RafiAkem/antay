import { useId } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/components/ui/cn'
import { Price } from '@/components/ui/price'
import type { CatalogCategory } from '@/types/catalog'
import { BuyLink } from '../buy-link'
import { EventGlyph } from '../event-glyph'
import { SCARCE_LEFT } from '../event-format'
import { PackageList } from './package-list'

type Props = {
  category: CatalogCategory
  // sisa terbesar di antara kategori, dipakai sebagai 100% bar
  maxLeft: number
  expanded: boolean
  onToggle: () => void
  buyHref: string
  buyable: boolean
}

// Kapasitas total kategori tidak dikirim server, jadi bar ketersediaan dibandingkan
// dengan kategori yang sisanya paling banyak. Bar jadi scarce kalau sisanya di
// bawah 20% pembanding itu; angka "Sisa N" tetap ditulis supaya tidak menebak.
export function TicketCategoryRow({ category, maxLeft, expanded, onToggle, buyHref, buyable }: Props) {
  const panelId = useId()
  const { soldOut, left } = category
  const share = maxLeft > 0 ? Math.max(4, Math.round((left / maxLeft) * 100)) : 0
  const lowShare = left < maxLeft * 0.2
  const scarce = !soldOut && left < SCARCE_LEFT

  return (
    <li className="border-t border-border-soft first:border-t-0">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="grid w-full gap-2 px-4 py-4 text-left transition-colors hover:bg-raised sm:px-5"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="grid min-w-0 gap-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className={cn('text-[15px] leading-[22px] font-bold', soldOut && 'text-muted')}>{category.name}</span>
              {category.isSeated ? <Badge tone="accent">Pakai kursi</Badge> : null}
            </span>
            {category.description ? (
              <span className="truncate text-[13px] leading-[19px] text-muted">{category.description}</span>
            ) : null}
          </span>
          <span className="flex flex-none items-center gap-2">
            {category.priceFrom !== null ? <Price amount={category.priceFrom} prefix="Mulai" size="sm" /> : null}
            <EventGlyph
              name="chevron"
              className={cn('text-muted transition-transform', expanded && 'rotate-180')}
            />
          </span>
        </span>

        <span className="flex items-center gap-3">
          {soldOut ? (
            <Badge tone="neutral" className="border border-border-soft">
              Habis
            </Badge>
          ) : (
            <>
              <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-pill bg-tint-100">
                <span
                  className={cn('block h-full rounded-pill', lowShare ? 'bg-scarce' : 'bg-accent')}
                  style={{ width: `${share}%` }}
                />
              </span>
              {scarce ? (
                <Badge tone="scarce">Sisa {left}</Badge>
              ) : (
                <span className="num flex-none text-xs text-muted">Sisa {left}</span>
              )}
            </>
          )}
        </span>
      </button>

      {/* Panel selalu dirender (hanya disembunyikan) supaya aria-controls tidak menunjuk ke elemen kosong. */}
      <div
        id={panelId}
        hidden={!expanded}
        className="grid gap-3 border-t border-dashed border-border-soft bg-ground px-4 pb-4 sm:px-5"
      >
        <PackageList packages={category.packages} categorySoldOut={soldOut} />
        <BuyLink to={buyHref} disabled={!buyable || soldOut} size="default" block>
          {soldOut ? 'Kategori ini habis' : buyable ? `Beli tiket ${category.name}` : 'Belum bisa dibeli'}
        </BuyLink>
      </div>
    </li>
  )
}
