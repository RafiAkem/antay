import { Badge } from '@/components/ui/badge'
import { formatRupiah } from '@/components/ui/format-rupiah'
import { Price } from '@/components/ui/price'
import type { CatalogPackage } from '@/types/catalog'
import { EventGlyph } from '../event-glyph'
import { SCARCE_LEFT } from '../event-format'

// Paket di dalam satu kategori, hanya untuk dibaca. Jumlah paket dipilih di
// halaman checkout, jadi di sini tidak ada stepper.
export function PackageList({ packages, categorySoldOut }: { packages: CatalogPackage[]; categorySoldOut: boolean }) {
  if (packages.length === 0) {
    return <p className="py-3 text-[13px] text-muted">Paket untuk kategori ini belum dibuka penyelenggara.</p>
  }
  return (
    <ul className="grid">
      {packages.map((pkg) => {
        const soldOut = categorySoldOut || pkg.left === 0
        const scarce = !soldOut && pkg.left !== null && pkg.left < SCARCE_LEFT
        return (
          <li
            key={pkg.id}
            className="flex items-center justify-between gap-3 border-t border-border-soft py-3 first:border-t-0"
          >
            <div className="grid min-w-0 gap-1">
              <span className={soldOut ? 'font-semibold text-muted' : 'font-semibold'}>{pkg.name}</span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <EventGlyph name="people" size={14} />
                  {pkg.pax} orang
                </span>
                {soldOut ? (
                  <Badge tone="neutral" className="border border-border-soft">
                    Habis
                  </Badge>
                ) : null}
                {scarce ? <Badge tone="scarce">Sisa {pkg.left} paket</Badge> : null}
              </span>
            </div>
            <div className="grid flex-none justify-items-end gap-0.5 text-right">
              <Price amount={pkg.price} size="sm" />
              {pkg.pax > 1 ? (
                <span className="num text-xs text-muted">{formatRupiah(pkg.pricePerPax)} per orang</span>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
