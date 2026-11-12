import { SCARCE_LEFT } from '@/components/events/detail/event-format'
import { EventGlyph } from '@/components/events/detail/event-glyph'
import { Badge } from '@/components/ui/badge'
import { formatRupiah } from '@/components/ui/format-rupiah'
import { Price } from '@/components/ui/price'
import { Stepper } from '@/components/ui/stepper'
import type { CatalogPackage } from '@/types/catalog'

type PackageOptionProps = {
  pkg: CatalogPackage
  quantity: number
  max: number
  onChange: (quantity: number) => void
}

export function PackageOption({ pkg, quantity, max, onChange }: PackageOptionProps) {
  const soldOut = pkg.left === 0
  const scarce = !soldOut && pkg.left !== null && pkg.left < SCARCE_LEFT
  // Stepper yang mentok karena batas 10 orang perlu alasan, bukan cuma tombol
  // plus yang tiba-tiba mati.
  const capped = !soldOut && quantity > 0 && quantity >= max

  return (
    <li className="flex items-center justify-between gap-3 border-t border-border-soft px-4 py-4 first:border-t-0 sm:px-5">
      <div className="grid min-w-0 gap-1">
        <span className={soldOut ? 'font-semibold text-muted' : 'font-semibold'}>{pkg.name}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <EventGlyph name="people" size={14} />
            {pkg.pax} orang
          </span>
          {soldOut ? <Badge tone="neutral" className="border border-border-soft">Habis</Badge> : null}
          {scarce ? <Badge tone="scarce">Sisa {pkg.left} paket</Badge> : null}
        </span>
        <span className="flex flex-wrap items-baseline gap-x-2">
          <Price amount={pkg.price} size="md" />
          {pkg.pax > 1 ? <span className="num text-xs text-muted">{formatRupiah(pkg.pricePerPax)} per orang</span> : null}
        </span>
        {capped ? <span className="text-xs text-muted">Sudah mencapai batas untuk paket ini.</span> : null}
      </div>
      <Stepper value={quantity} max={max} onChange={onChange} label={`jumlah paket ${pkg.name}`} />
    </li>
  )
}
