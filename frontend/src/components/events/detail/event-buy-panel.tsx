import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Price } from '@/components/ui/price'
import { StickyCta } from '@/components/ui/sticky-cta'
import type { CatalogEventDetail } from '@/types/catalog'
import { BuyLink } from './buy-link'
import { checkoutPath, saleStatusOf, sortCategories } from './event-format'

function StartingPrice({ amount }: { amount: number | null }) {
  if (amount === null) return <span className="text-sm text-muted">Harga belum diumumkan</span>
  return <Price amount={amount} prefix="Mulai" size="lg" />
}

// Panel kanan yang menempel di desktop. Daftar kategori di sini jalan pintas:
// langsung ke checkout dengan kategori itu sudah terpilih.
export function EventBuyPanel({ event }: { event: CatalogEventDetail }) {
  const sale = saleStatusOf(event)
  const categories = sortCategories(event.categories)

  return (
    <aside
      aria-label="Beli tiket"
      className="sticky top-[calc(var(--spacing-header)+16px)] hidden self-start rounded-card border border-border-soft bg-surface p-5 lg:grid lg:gap-4"
    >
      <div className="grid gap-2">
        <StartingPrice amount={event.priceFrom} />
        <Badge tone={sale.tone} className="w-fit">
          {sale.label}
        </Badge>
      </div>
      <BuyLink to={checkoutPath(event.id)} disabled={!sale.buyable} block>
        {sale.buyable ? 'Beli tiket' : sale.blockedLabel}
      </BuyLink>

      {categories.length > 0 ? (
        <div className="grid gap-1 border-t border-border-soft pt-3">
          <span className="text-xs font-semibold text-muted">Kategori</span>
          <ul className="grid">
            {categories.map((category) => {
              const open = sale.buyable && !category.soldOut
              const body = (
                <>
                  <span className="min-w-0 truncate">{category.name}</span>
                  {category.soldOut ? (
                    <span className="flex-none text-xs font-semibold text-muted">Habis</span>
                  ) : category.priceFrom !== null ? (
                    <Price amount={category.priceFrom} size="sm" className="flex-none" />
                  ) : null}
                </>
              )
              return (
                <li key={category.id}>
                  {open ? (
                    <Link
                      to={checkoutPath(event.id, category.id)}
                      className="flex items-center justify-between gap-3 rounded-control px-2 py-2 -mx-2 text-sm hover:bg-raised"
                    >
                      {body}
                    </Link>
                  ) : (
                    <span className="-mx-2 flex items-center justify-between gap-3 px-2 py-2 text-sm text-muted">
                      {body}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </aside>
  )
}

// Bar bawah di ponsel dan tablet. Di desktop panel kanan yang mengambil alih.
export function EventBuyBar({ event }: { event: CatalogEventDetail }) {
  const sale = saleStatusOf(event)
  return (
    <StickyCta className="lg:hidden">
      <div className="grid min-w-0">
        <StartingPrice amount={event.priceFrom} />
        {!sale.buyable ? <span className="truncate text-xs text-muted">{sale.label}</span> : null}
      </div>
      <BuyLink to={checkoutPath(event.id)} disabled={!sale.buyable}>
        {sale.buyable ? 'Beli tiket' : sale.blockedLabel}
      </BuyLink>
    </StickyCta>
  )
}
