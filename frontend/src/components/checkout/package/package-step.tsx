import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/pill'
import { Paragraph } from '@/components/ui/text'
import type { CatalogCategory } from '@/types/catalog'
import { MAX_PAX_PER_ORDER } from '../checkout-state'
import { PackageOption } from './package-option'

type PackageStepProps = {
  category: CatalogCategory
  quantities: Record<string, number>
  maxQuantity: (packageId: string) => number
  onChange: (packageId: string, quantity: number) => void
  onChangeCategory: () => void
}

export function PackageStep({ category, quantities, maxQuantity, onChange, onChangeCategory }: PackageStepProps) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3 rounded-card border border-border-soft bg-surface px-4 py-3 sm:px-5">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Kategori</span>
          <b className="truncate font-bold">{category.name}</b>
          {category.isSeated ? <Badge tone="accent">Pakai kursi</Badge> : null}
        </span>
        <Button variant="ghost" size="small" onClick={onChangeCategory}>
          Ganti
        </Button>
      </div>

      {category.packages.length === 0 ? (
        <Empty
          title="Paket untuk kategori ini belum dibuka."
          hint="Pilih kategori lain atau kembali lagi nanti saat penyelenggara sudah memasang harganya."
        />
      ) : (
        <ul className="overflow-hidden rounded-card border border-border-soft bg-surface">
          {category.packages.map((pkg) => (
            <PackageOption
              key={pkg.id}
              pkg={pkg}
              quantity={quantities[pkg.id] ?? 0}
              max={maxQuantity(pkg.id)}
              onChange={(quantity) => onChange(pkg.id, quantity)}
            />
          ))}
        </ul>
      )}

      <Paragraph tone="muted" size="sm">
        Boleh ambil lebih dari satu paket, maksimal {MAX_PAX_PER_ORDER} orang per pesanan.
        {category.isSeated ? ' Kursi untuk tiap orang dipilih di langkah berikutnya.' : ''}
      </Paragraph>
    </div>
  )
}
